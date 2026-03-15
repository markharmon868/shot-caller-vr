/**
 * Nano Banana Pro — multi-angle reference image generation via Vertex AI.
 *
 * Uses Gemini 2.0 Flash Preview (image generation) to generate clean, photorealistic
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

function sanitizeLocation(input: string): string {
  if (input.length > 200) throw new Error("Location name too long (max 200 chars)");
  return input.replace(/[^\w\s,.\-'()&/]/g, "");
}

function buildPrompt(location: string, direction: string): string {
  const safe = sanitizeLocation(location);
  return [
    `Photorealistic architectural photograph of ${safe}, viewed from the ${direction}.`,
    `The scene must be completely empty of people, vehicles, and moving objects.`,
    `Capture the full structure and surrounding environment with consistent golden-hour lighting.`,
    `All four cardinal views of this location must share identical lighting, weather (clear sky), and time of day.`,
    `Sharp focus throughout, high dynamic range, 16:9 aspect ratio, professional location scouting reference photo.`,
    `Ensure architectural details, textures, and spatial relationships are accurate and consistent across views.`,
  ].join(" ");
}

/**
 * Generate multi-angle reference images of a location using Vertex AI Gemini 2.0 Flash Preview.
 */
export async function generateReferenceImages(
  options: NanoBananaProOptions
): Promise<NanoBananaProResult> {
  // Mock mode: return placeholder images
  if (process.env.SHOT_CALLER_PIPELINE_MODE === "mock") {
    const numAngles = Math.min(options.numAngles ?? 4, ANGLE_LABELS.length);
    const angles = ANGLE_LABELS.slice(0, numAngles);
    const images: AngleImage[] = [];

    // Create a minimal valid PNG buffer (same as Street View mock)
    const mockPngBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
      0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01,
      0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00,
      0x90, 0x77, 0x53, 0xDE,
      0x00, 0x00, 0x00, 0x00,
      0x49, 0x45, 0x4E, 0x44,
      0xAE, 0x42, 0x60, 0x82,
    ]);

    for (const { angle, azimuth } of angles) {
      console.log(`  [MOCK] Generating ${angle} view (${azimuth}°)...`);
      images.push({ buffer: mockPngBuffer, angle, azimuth });
      console.log(`  ✓ ${angle} view generated (mock)`);
    }

    return { images };
  }

  const project = process.env.GOOGLE_CLOUD_PROJECT;
  if (!project) {
    throw new Error("GOOGLE_CLOUD_PROJECT is required. Set it in .env (or set SHOT_CALLER_PIPELINE_MODE=mock for local dev).");
  }
  const location = process.env.GOOGLE_CLOUD_LOCATION ?? "us-central1";

  const vertexAI = new VertexAI({ project, location });

  const VERTEX_MODEL = process.env.VERTEX_AI_MODEL ?? "gemini-2.0-flash-preview-image-generation";
  // responseModalities is supported at runtime but not yet in the SDK type definitions
  const model = vertexAI.getGenerativeModel({
    model: VERTEX_MODEL,
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
    } as Record<string, unknown>,
  });

  const numAngles = Math.min(options.numAngles ?? 4, ANGLE_LABELS.length);
  const angles = ANGLE_LABELS.slice(0, numAngles);
  const images: AngleImage[] = [];

  // Pre-compute base64 once (avoids re-encoding per iteration)
  const referenceBase64 = options.referenceImage?.toString("base64");

  for (const { angle, azimuth, direction } of angles) {
    console.log(`  Generating ${angle} view (${azimuth}°)...`);

    const prompt = buildPrompt(options.locationName, direction);

    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
      { text: prompt },
    ];

    // If reference image provided, include it for grounding
    if (referenceBase64) {
      parts.unshift({
        inlineData: {
          mimeType: "image/jpeg",
          data: referenceBase64,
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
