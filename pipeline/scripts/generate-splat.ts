#!/usr/bin/env npx tsx
/**
 * Generate Gaussian splat from images via World Labs Marble API.
 *
 * Usage:
 *   npx tsx pipeline/scripts/generate-splat.ts --multi              # Multi-image from pipeline/data/output/
 *   npx tsx pipeline/scripts/generate-splat.ts --image <path>       # Single image
 *   npx tsx pipeline/scripts/generate-splat.ts --multi --model plus # Higher quality (~5min)
 */
import "../env.js";
import { generateWorldModel } from "../world-model/index.js";

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (k: string) => {
    const i = args.indexOf(k);
    return i >= 0 && args[i + 1] ? args[i + 1] : null;
  };

  return {
    multi: args.includes("--multi"),
    imagePath: get("--image"),
    model: (get("--model") ?? "mini") as "mini" | "plus",
    inputDir: get("--input-dir"),
    outputPath: get("--output"),
  };
}

async function main() {
  const opts = parseArgs();

  if (!opts.multi && !opts.imagePath) {
    // Default to multi-image mode
    opts.multi = true;
  }

  console.log(
    `Marble API: ${opts.imagePath ? "single-image" : "multi-image"} mode, model: ${opts.model}`
  );

  const result = await generateWorldModel({
    imagePath: opts.imagePath ?? undefined,
    inputDir: opts.inputDir ?? undefined,
    outputPath: opts.outputPath ?? undefined,
    model: opts.model,
  });

  if (result.success && result.splatPath) {
    console.log(`\nGenerated: ${result.splatPath}`);
    console.log(`World ID: ${result.worldId}`);
    console.log(`\nLoad in editor: npm run dev → enter ./splats/generated.spz in URL field`);
  } else {
    console.error(`\nFailed: ${result.error}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
