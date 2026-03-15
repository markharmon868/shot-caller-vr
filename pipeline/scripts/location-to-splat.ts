#!/usr/bin/env npx tsx
/**
 * Full pipeline: Location → Street View → Nano Banana Pro (grounded) → Marble → .spz
 *
 * This is the correct flow:
 * 1. Fetch REAL Street View photos from Google (4 headings)
 * 2. Use each SV photo as a REFERENCE IMAGE for Nano Banana Pro to generate
 *    clean, consistent versions from the same angle (no pedestrians, no cars)
 * 3. Send all 4 cleaned images to Marble multi-image API for 3D reconstruction
 *
 * Usage:
 *   npx tsx pipeline/scripts/location-to-splat.ts \
 *     --lat 37.7786 --lng -122.3893 \
 *     --location "Oracle Park, San Francisco" \
 *     --output public/splats/oracle-park.spz
 */
import "../env.js";
import { fetchStreetViewImage } from "../street-view/index.js";
// Nano Banana Pro module not used directly here — we call Vertex AI inline
// for per-image grounding with the Street View reference
import { generateWorldModel } from "../world-model/index.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { VertexAI } from "@google-cloud/vertexai";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const HEADINGS = [0, 90, 180, 270];

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (k: string) => {
    const i = args.indexOf(k);
    return i >= 0 && args[i + 1] ? args[i + 1] : null;
  };
  const lat = get("--lat");
  const lng = get("--lng");
  const location = get("--location");
  if (!lat || !lng) {
    console.error('Usage: npx tsx pipeline/scripts/location-to-splat.ts --lat <lat> --lng <lng> --location "Name" [--output <path>] [--model mini|plus]');
    process.exit(1);
  }
  return {
    lat: parseFloat(lat),
    lng: parseFloat(lng),
    location: location ?? `${lat}, ${lng}`,
    output: get("--output") ?? "public/splats/generated.spz",
    model: (get("--model") ?? "mini") as "mini" | "plus",
    workDir: get("--work-dir") ?? path.resolve(__dirname, `../data/work-${Date.now()}`),
  };
}

async function main() {
  const opts = parseArgs();
  const svDir = path.join(opts.workDir, "streetview");
  const cleanDir = path.join(opts.workDir, "cleaned");
  fs.mkdirSync(svDir, { recursive: true });
  fs.mkdirSync(cleanDir, { recursive: true });

  console.log(`\n========================================`);
  console.log(`Location: ${opts.location}`);
  console.log(`Coords: ${opts.lat}, ${opts.lng}`);
  console.log(`Output: ${opts.output}`);
  console.log(`Model: Marble 0.1-${opts.model}`);
  console.log(`========================================\n`);

  // ── Step 1: Fetch Street View images ──────────────────────────────────────
  console.log("=== Step 1/3: Fetching Street View images ===\n");

  const svImages: { heading: number; buffer: Buffer; path: string }[] = [];
  for (const heading of HEADINGS) {
    console.log(`  Fetching heading ${heading}°...`);
    const result = await fetchStreetViewImage({
      lat: opts.lat,
      lng: opts.lng,
      heading,
      size: "640x640",
      fov: 90,
    });
    const filename = `sv_${heading}deg.jpg`;
    const filepath = path.join(svDir, filename);
    fs.writeFileSync(filepath, result.imageBuffer);
    svImages.push({ heading, buffer: result.imageBuffer, path: filepath });
    console.log(`  ✓ ${filename} (${(result.imageBuffer.length / 1024).toFixed(0)} KB)`);
  }
  console.log(`\n  ${svImages.length} Street View images saved to ${svDir}\n`);

  // ── Step 2: Clean each SV image with Nano Banana Pro ──────────────────────
  console.log("=== Step 2/3: Generating clean reference images (Vertex AI) ===\n");
  console.log("  Using each Street View photo as reference for its angle...\n");

  const project = process.env.GOOGLE_CLOUD_PROJECT;
  if (!project) throw new Error("GOOGLE_CLOUD_PROJECT is required.");
  const region = process.env.GOOGLE_CLOUD_LOCATION ?? "us-central1";
  const VERTEX_MODEL = process.env.VERTEX_AI_MODEL ?? "gemini-2.0-flash-preview-image-generation";

  const vertexAI = new VertexAI({ project, location: region });
  const model = vertexAI.getGenerativeModel({
    model: VERTEX_MODEL,
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
    } as Record<string, unknown>,
  });

  const ANGLE_NAMES: Record<number, string> = {
    0: "front (facing north)",
    90: "right (facing east)",
    180: "back (facing south)",
    270: "left (facing west)",
  };

  const cleanedImages: { azimuth: number; path: string }[] = [];

  for (const sv of svImages) {
    const angleName = ANGLE_NAMES[sv.heading] ?? `${sv.heading}°`;
    console.log(`  Processing ${angleName} (heading ${sv.heading}°)...`);

    const svBase64 = sv.buffer.toString("base64");

    const prompt = [
      `You are given a real Google Street View photograph of ${opts.location}, taken from the ${angleName} direction.`,
      `Generate a CLEAN version of this exact same view:`,
      `- Remove all pedestrians, vehicles, and moving objects`,
      `- Remove any text overlays, watermarks, or UI elements`,
      `- Keep the EXACT same camera angle, perspective, and field of view`,
      `- Preserve all architecture, buildings, streets, and fixed structures exactly as they appear`,
      `- Maintain the same lighting, time of day, and weather conditions`,
      `- Fill in areas where people/vehicles were removed with realistic background continuation`,
      `- Output a clean, photorealistic, high-resolution photograph suitable for 3D reconstruction`,
      `- The result must look like the same location photographed on an empty day`,
    ].join("\n");

    const parts = [
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: svBase64,
        },
      },
      { text: prompt },
    ];

    try {
      const response = await model.generateContent({
        contents: [{ role: "user", parts }],
      });

      const candidate = response.response?.candidates?.[0];
      if (!candidate?.content?.parts) {
        console.warn(`  ⚠ No image response for ${angleName}, using original SV image`);
        const fallbackPath = path.join(cleanDir, `reference_${sv.heading}deg.jpg`);
        fs.copyFileSync(sv.path, fallbackPath);
        cleanedImages.push({ azimuth: sv.heading, path: fallbackPath });
        continue;
      }

      let saved = false;
      for (const part of candidate.content.parts) {
        const inlineData = (part as { inlineData?: { mimeType: string; data: string } }).inlineData;
        if (inlineData?.data) {
          const buffer = Buffer.from(inlineData.data, "base64");
          const filename = `reference_${sv.heading}deg.jpg`;
          const filepath = path.join(cleanDir, filename);
          fs.writeFileSync(filepath, buffer);
          cleanedImages.push({ azimuth: sv.heading, path: filepath });
          console.log(`  ✓ ${filename} (${(buffer.length / 1024).toFixed(0)} KB) — cleaned from SV`);
          saved = true;
          break;
        }
      }
      if (!saved) {
        console.warn(`  ⚠ No image in response for ${angleName}, using original`);
        const fallbackPath = path.join(cleanDir, `reference_${sv.heading}deg.jpg`);
        fs.copyFileSync(sv.path, fallbackPath);
        cleanedImages.push({ azimuth: sv.heading, path: fallbackPath });
      }
    } catch (err) {
      console.warn(`  ⚠ Error cleaning ${angleName}: ${err instanceof Error ? err.message : err}`);
      console.warn(`  Using original Street View image as fallback`);
      const fallbackPath = path.join(cleanDir, `reference_${sv.heading}deg.jpg`);
      fs.copyFileSync(sv.path, fallbackPath);
      cleanedImages.push({ azimuth: sv.heading, path: fallbackPath });
    }
  }
  console.log(`\n  ${cleanedImages.length} cleaned reference images ready in ${cleanDir}\n`);

  // ── Step 3: Generate Gaussian splat via Marble ────────────────────────────
  console.log("=== Step 3/3: Generating Gaussian splat (Marble API) ===\n");

  const result = await generateWorldModel({
    imagePaths: cleanedImages.map((img) => img.path),
    outputPath: opts.output,
    model: opts.model,
    reconstruct: true,
    textPrompt: `Photorealistic 3D scene of ${opts.location}, architectural exterior`,
  });

  if (result.success) {
    console.log(`\n========================================`);
    console.log(`SUCCESS!`);
    console.log(`  Splat: ${result.splatPath}`);
    console.log(`  World ID: ${result.worldId}`);
    console.log(`  Load in editor: https://localhost:8081/?mode=editor&spz=${opts.output.replace("public/", "./")}`);
    console.log(`========================================\n`);
  } else {
    console.error(`\nFailed: ${result.error}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
