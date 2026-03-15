#!/usr/bin/env npx tsx
/**
 * Generate reference images for a specific location and optionally create a splat.
 * Usage: npx tsx pipeline/scripts/gen-location.ts --location "..." --output-dir <dir> [--splat <path>]
 */
import "../env.js";
import { generateReferenceImages } from "../nano-banana-pro/index.js";
import { generateWorldModel } from "../world-model/index.js";
import fs from "fs";
import path from "path";

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (k: string) => {
    const i = args.indexOf(k);
    return i >= 0 && args[i + 1] ? args[i + 1] : null;
  };
  const location = get("--location");
  if (!location) {
    console.error('Usage: npx tsx pipeline/scripts/gen-location.ts --location "..." --output-dir <dir> [--splat <path>] [--model mini|plus]');
    process.exit(1);
  }
  return {
    location,
    outputDir: get("--output-dir") ?? "pipeline/data/generated",
    splatPath: get("--splat"),
    model: (get("--model") ?? "mini") as "mini" | "plus",
  };
}

async function main() {
  const opts = parseArgs();
  fs.mkdirSync(opts.outputDir, { recursive: true });

  console.log(`\nGenerating reference images for: ${opts.location}`);
  console.log(`Output dir: ${opts.outputDir}\n`);

  const result = await generateReferenceImages({
    locationName: opts.location,
  });

  for (const img of result.images) {
    const filename = `reference_${img.azimuth}deg.jpg`;
    const filepath = path.join(opts.outputDir, filename);
    fs.writeFileSync(filepath, img.buffer);
    console.log(`  Saved: ${filepath} (${(img.buffer.length / 1024).toFixed(0)} KB)`);
  }
  console.log(`\n${result.images.length} reference image(s) generated.`);

  if (opts.splatPath) {
    console.log(`\nGenerating Gaussian splat (${opts.model})...`);
    const splatResult = await generateWorldModel({
      inputDir: opts.outputDir,
      outputPath: opts.splatPath,
      model: opts.model,
      reconstruct: true,
      textPrompt: `Photorealistic 3D scene of ${opts.location}`,
    });
    if (splatResult.success) {
      console.log(`\nSplat saved: ${splatResult.splatPath}`);
      console.log(`World ID: ${splatResult.worldId}`);
    } else {
      console.error(`\nSplat generation failed: ${splatResult.error}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
