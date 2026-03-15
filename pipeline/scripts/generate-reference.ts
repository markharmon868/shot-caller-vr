#!/usr/bin/env npx tsx
/**
 * Generate clean multi-angle reference images of a location via Vertex AI.
 *
 * Usage:
 *   npx tsx pipeline/scripts/generate-reference.ts --location "Golden Gate Bridge, San Francisco"
 *   npx tsx pipeline/scripts/generate-reference.ts --location "Times Square, NYC" --reference pipeline/data/raw/streetview_xxx.jpg
 */
import "../env.js";
import { generateReferenceImages } from "../nano-banana-pro/index.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const generatedDir = path.resolve(__dirname, "../data/generated");

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (k: string) => {
    const i = args.indexOf(k);
    return i >= 0 && args[i + 1] ? args[i + 1] : null;
  };

  const location = get("--location");
  if (!location) {
    console.error(
      "Usage: npx tsx pipeline/scripts/generate-reference.ts --location \"Location Name\" [--reference <image-path>]"
    );
    process.exit(1);
  }

  return {
    location,
    referencePath: get("--reference"),
  };
}

async function main() {
  const opts = parseArgs();
  fs.mkdirSync(generatedDir, { recursive: true });

  console.log(`Generating reference images for: ${opts.location}`);

  let referenceImage: Buffer | undefined;
  if (opts.referencePath) {
    if (!fs.existsSync(opts.referencePath)) {
      console.error(`Reference image not found: ${opts.referencePath}`);
      process.exit(1);
    }
    referenceImage = fs.readFileSync(opts.referencePath);
    console.log(`Using reference image: ${opts.referencePath}`);
  }

  const result = await generateReferenceImages({
    locationName: opts.location,
    referenceImage,
  });

  for (const img of result.images) {
    const filename = `reference_${img.azimuth}deg.jpg`;
    const filepath = path.join(generatedDir, filename);
    fs.writeFileSync(filepath, img.buffer);
    console.log(`  Saved: ${filename}`);
  }

  console.log(`\n${result.images.length} reference image(s) saved to ${generatedDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
