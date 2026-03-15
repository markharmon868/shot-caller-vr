#!/usr/bin/env npx tsx
/**
 * Direct Street View → Marble pipeline (skips Nano Banana).
 * Uses raw Street View photos for maximum geometric accuracy.
 */
import "../env.js";
import { fetchStreetViewImage } from "../street-view/index.js";
import { generateWorldModel } from "../world-model/index.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (k: string) => {
    const i = args.indexOf(k);
    return i >= 0 && args[i + 1] ? args[i + 1] : null;
  };
  return {
    lat: parseFloat(get("--lat") ?? "0"),
    lng: parseFloat(get("--lng") ?? "0"),
    location: get("--location") ?? "Unknown",
    output: get("--output") ?? "public/splats/generated.spz",
    model: (get("--model") ?? "mini") as "mini" | "plus",
  };
}

async function main() {
  const opts = parseArgs();
  const dir = path.resolve(__dirname, `../data/sv-direct-${Date.now()}`);
  fs.mkdirSync(dir, { recursive: true });

  console.log(`\n=== Direct SV → Marble: ${opts.location} ===\n`);

  const paths: string[] = [];
  for (const h of [0, 90, 180, 270]) {
    console.log(`  Fetching heading ${h}°...`);
    const r = await fetchStreetViewImage({ lat: opts.lat, lng: opts.lng, heading: h, size: "640x640" });
    const p = path.join(dir, `sv_${h}deg.jpg`);
    fs.writeFileSync(p, r.imageBuffer);
    paths.push(p);
    console.log(`  ✓ ${(r.imageBuffer.length / 1024).toFixed(0)} KB`);
  }

  console.log(`\nUploading to Marble (${opts.model})...`);
  const result = await generateWorldModel({
    imagePaths: paths,
    outputPath: opts.output,
    model: opts.model,
    reconstruct: true,
    textPrompt: `Photorealistic 3D scene of ${opts.location}`,
  });

  if (result.success) {
    console.log(`\nSUCCESS: ${result.splatPath} (${result.worldId})`);
    console.log(`Load: https://localhost:8081/?mode=editor&spz=${opts.output.replace("public/", "./")}`);
  } else {
    console.error(`\nFailed: ${result.error}`);
    process.exit(1);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
