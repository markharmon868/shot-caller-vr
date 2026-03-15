#!/usr/bin/env npx tsx
/**
 * Full pipeline: Street View fetch → Marble Labs → .spz
 *
 * Usage:
 *   npm run pipeline:run -- --lat 34.0522 --lng -118.2437
 *   npm run pipeline:run -- --lat 34.0522 --lng -118.2437 --out public/splats/my-scene.spz
 *
 * Requires:
 *   GOOGLE_MAPS_API_KEY — Street View Static API enabled in Google Cloud
 *   MARBLE_LABS_API_KEY — your Marble Labs API key
 */
import "../env.js";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function run(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("npx", ["tsx", ...args], {
      stdio: "inherit",
      shell: true,
      cwd: path.resolve(__dirname, "../.."),
    });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`Exit ${code}`))));
  });
}

async function main() {
  const args = process.argv.slice(2);
  const get = (k: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };

  const lat = get("--lat");
  const lng = get("--lng");
  const out = get("--out");
  const size = get("--size");

  if (!lat || !lng) {
    console.error("Usage: npm run pipeline:run -- --lat <lat> --lng <lng> [--out path/to/output.spz] [--size 640x640]");
    process.exit(1);
  }

  console.log("=== Step 1/2: Fetch Street View images ===");
  const fetchArgs = ["pipeline/scripts/fetch-street-view.ts", "--lat", lat, "--lng", lng];
  if (size) fetchArgs.push("--size", size);
  await run(fetchArgs);

  console.log("\n=== Step 2/2: Generate Gaussian splat via Marble Labs ===");
  const splatArgs = ["pipeline/scripts/generate-splat.ts"];
  if (out) splatArgs.push("--out", out);
  await run(splatArgs);

  console.log("\n=== Pipeline complete ===");
}

main().catch((err) => { console.error(err); process.exit(1); });
