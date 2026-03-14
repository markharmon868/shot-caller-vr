#!/usr/bin/env npx tsx
/**
 * Run full pipeline: fetch → expand → output.
 * Usage: npm run pipeline:run -- --lat 40.7128 --lng -74.0060
 */
import "../env.js";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function run(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: "inherit",
      shell: true,
      cwd: path.resolve(__dirname, "../.."),
    });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`Exit ${code}`))));
  });
}

async function main() {
  const args = process.argv.slice(2);
  const lat = args.find((a, i) => args[i - 1] === "--lat");
  const lng = args.find((a, i) => args[i - 1] === "--lng");
  if (!lat || !lng) {
    console.error("Usage: npm run pipeline:run -- --lat <lat> --lng <lng>");
    process.exit(1);
  }
  await run("npx", ["tsx", "pipeline/scripts/fetch-street-view.ts", "--lat", lat, "--lng", lng]);
  await run("npx", ["tsx", "pipeline/scripts/expand-images.ts"]);
  await run("npx", ["tsx", "pipeline/scripts/prepare-output.ts"]);
  console.log("Pipeline complete. Output in pipeline/data/output/");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
