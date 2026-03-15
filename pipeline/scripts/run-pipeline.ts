#!/usr/bin/env npx tsx
/**
 * Run full pipeline: fetch → generate-reference → prepare-output → generate-splat.
 *
 * Usage:
 *   npm run pipeline:full -- --lat 37.8199 --lng -122.4783 --location "Golden Gate Bridge, San Francisco"
 *   npm run pipeline:full -- --lat 40.7128 --lng -74.0060 --location "Times Square, NYC" --skip-nano
 *   npm run pipeline:full -- --lat 40.7128 --lng -74.0060 --location "Times Square, NYC" --skip-splat
 */
import "../env.js";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../..");

function run(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: "inherit",
      cwd: projectRoot,
    });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`Exit ${code}`))
    );
  });
}

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
    console.error(
      'Usage: npm run pipeline:full -- --lat <lat> --lng <lng> --location "Location Name" [--skip-nano] [--skip-splat] [--model mini|plus]'
    );
    process.exit(1);
  }

  return {
    lat,
    lng,
    location: location ?? `${lat}, ${lng}`,
    skipNano: args.includes("--skip-nano"),
    skipSplat: args.includes("--skip-splat"),
    model: get("--model") ?? "mini",
  };
}

async function main() {
  const opts = parseArgs();

  // Step 1: Fetch Street View images
  console.log("\n=== Step 1/4: Fetch Street View ===");
  await run("npx", [
    "tsx",
    "pipeline/scripts/fetch-street-view.ts",
    "--lat",
    opts.lat,
    "--lng",
    opts.lng,
  ]);

  // Step 2: Generate reference images (Nano Banana Pro via Vertex AI)
  if (!opts.skipNano) {
    console.log("\n=== Step 2/4: Generate Reference Images (Vertex AI) ===");
    const refArgs = [
      "tsx",
      "pipeline/scripts/generate-reference.ts",
      "--location",
      opts.location,
    ];
    // Use first Street View image as reference for grounding
    const fs = await import("fs");
    const rawDir = path.resolve(__dirname, "../data/raw");
    if (fs.existsSync(rawDir)) {
      const rawImages = fs.readdirSync(rawDir).filter((f: string) => /\.jpg$/i.test(f)).sort();
      const frontImage = rawImages.find((f: string) => f.includes("_0deg_"));
      if (frontImage) {
        refArgs.push("--reference", path.join(rawDir, frontImage));
      }
    }
    await run("npx", refArgs);
  } else {
    console.log("\n=== Step 2/4: Skipped (--skip-nano) ===");
  }

  // Step 3: Prepare output
  console.log("\n=== Step 3/4: Prepare Output ===");
  await run("npx", ["tsx", "pipeline/scripts/prepare-output.ts"]);

  // Step 4: Generate splat
  if (!opts.skipSplat) {
    console.log("\n=== Step 4/4: Generate Gaussian Splat ===");
    await run("npx", [
      "tsx",
      "pipeline/scripts/generate-splat.ts",
      "--multi",
      "--model",
      opts.model,
    ]);
  } else {
    console.log("\n=== Step 4/4: Skipped (--skip-splat) ===");
  }

  console.log("\nPipeline complete!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
