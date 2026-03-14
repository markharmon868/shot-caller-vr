#!/usr/bin/env npx tsx
/**
 * Generate Gaussian splat from pipeline output images.
 * Stub — documents workflow until Marble/Luma API integration.
 * Usage: npx tsx pipeline/scripts/generate-splat.ts
 */
import "../env.js";
import { generateWorldModel } from "../world-model/index.js";

async function main() {
  const result = await generateWorldModel();
  if (result.success && result.splatPath) {
    console.log(`Generated: ${result.splatPath}`);
  } else {
    console.log(result.error);
    console.log("\nManual workflow:");
    console.log("  1. Run pipeline to populate pipeline/data/output/");
    console.log("  2. Upload images to World Labs Marble (marble.worldlabs.ai) or Luma AI");
    console.log("  3. Export .spz and place in public/splats/");
    console.log("  4. App loads from ./splats/<your-file>.spz");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
