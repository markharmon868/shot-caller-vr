/**
 * Nano Banana Pro — multi-angle reference image generation via Vertex AI.
 *
 * Uses Gemini 3 Pro Image Preview to generate clean, photorealistic
 * multi-angle reference images of a location for 3D reconstruction.
 *
 * Auth: gcloud Application Default Credentials (no API key needed).
 * Project: configured via GOOGLE_CLOUD_PROJECT env var.
 */

import { VertexAI } from "@google-cloud/vertexai";

export interface NanoBananaProOptions {
  /** Location name, e.g. "Golden Gate Bridge, San Francisco" */
  locationName: string;
  /** Optional Street View image for grounding */
  referenceImage?: Buffer;
  /** Number of angles to generate (default 4: front, right, back, left) */
  numAngles?: number;
}

export interface AngleImage {
  buffer: Buffer;
  angle: string;
  azimuth: number;
}

export interface NanoBananaProResult {
  images: AngleImage[];
}

const ANGLE_LABELS: { angle: string; azimuth: number; direction: string }[] = [
  { angle: "front", azimuth: 0, direction: "facing north" },
  { angle: "right", azimuth: 90, direction: "facing east, 90° clockwise from north" },
  { angle: "back", azimuth: 180, direction: "facing south" },
  { angle: "left", azimuth: 270, direction: "facing west, 270° clockwise from north" },
];

function buildPrompt(location: string, direction: string): string {
  return `Clean, photorealistic photograph of ${location} from the ${direction}, no pedestrians, no vehicles, no text overlays, film location scouting reference, 16:9 aspect ratio, natural lighting, high detail`;
}

/**
 * Generate multi-angle reference images of a location using Vertex AI Gemini 3 Pro Image Preview.
 */
export async function generateReferenceImages(
  options: NanoBananaProOptions
): Promise<NanoBananaProResult> {
  const project = process.env.GOOGLE_CLOUD_PROJECT ?? "ary-pi-5";
  const location = process.env.GOOGLE_CLOUD_LOCATION ?? "us-central1";

  const vertexAI = new VertexAI({ project, location });
  const model = vertexAI.getGenerativeModel({
    model: "gemini-2.0-flash-preview-image-generation",
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"] as unknown as undefined,
    } as Record<string, unknown>,
  });

  const numAngles = Math.min(options.numAngles ?? 4, ANGLE_LABELS.length);
  const angles = ANGLE_LABELS.slice(0, numAngles);
  const images: AngleImage[] = [];

  for (const { angle, azimuth, direction } of angles) {
    console.log(`  Generating ${angle} view (${azimuth}°)...`);

    const prompt = buildPrompt(options.locationName, direction);

    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
      { text: prompt },
    ];

    // If reference image provided, include it for grounding
    if (options.referenceImage) {
      parts.unshift({
        inlineData: {
          mimeType: "image/jpeg",
          data: options.referenceImage.toString("base64"),
        },
      });
      parts.push({
        text: "Use the provided reference image as a guide for the scene's style, lighting, and architecture. Generate a new view from the specified angle.",
      });
    }

    const response = await model.generateContent({
      contents: [{ role: "user", parts }],
    });

    const candidate = response.response?.candidates?.[0];
    if (!candidate?.content?.parts) {
      console.warn(`  Warning: No response for ${angle} view, skipping`);
      continue;
    }

    // Find image part in response
    for (const part of candidate.content.parts) {
      const inlineData = (part as { inlineData?: { mimeType: string; data: string } }).inlineData;
      if (inlineData?.data) {
        const buffer = Buffer.from(inlineData.data, "base64");
        images.push({ buffer, angle, azimuth });
        console.log(`  ✓ ${angle} view generated (${(buffer.length / 1024).toFixed(0)} KB)`);
        break;
      }
    }
  }

  if (images.length === 0) {
    throw new Error("Failed to generate any reference images. Check Vertex AI credentials and quota.");
  }

  return { images };
}
