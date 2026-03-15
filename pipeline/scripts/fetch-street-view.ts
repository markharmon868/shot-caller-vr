#!/usr/bin/env npx tsx
/**
 * Fetch Street View images for a location (24 images: 8 headings × 3 pitches).
 *
 * Usage:
 *   npx tsx pipeline/scripts/fetch-street-view.ts --lat 34.0522 --lng -118.2437
 *   npx tsx pipeline/scripts/fetch-street-view.ts --lat 34.0522 --lng -118.2437 --size 1280x1280
 */
import "../env.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { fetchStreetViewImages } from "../street-view/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rawDir = path.resolve(__dirname, "../data/raw");

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (k: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
  const lat = get("--lat");
  const lng = get("--lng");
  if (!lat || !lng) {
    console.error("Usage: npx tsx pipeline/scripts/fetch-street-view.ts --lat <lat> --lng <lng> [--size 640x640]");
    process.exit(1);
  }
  return { lat: parseFloat(lat), lng: parseFloat(lng), size: get("--size") ?? "640x640" };
}

async function main() {
  const opts = parseArgs();
  fs.mkdirSync(rawDir, { recursive: true });

  // Clear previous raw images so Marble gets a clean set
  for (const f of fs.readdirSync(rawDir)) {
    if (/\.(jpg|jpeg|png)$/i.test(f)) fs.unlinkSync(path.join(rawDir, f));
  }

  console.log(`Fetching Street View at ${opts.lat}, ${opts.lng}...`);
  const result = await fetchStreetViewImages({ lat: opts.lat, lng: opts.lng, size: opts.size });

  for (const img of result.images) {
    const filename = `sv_h${img.heading}_p${img.pitch}.jpg`;
    fs.writeFileSync(path.join(rawDir, filename), img.buffer);
  }

  // Save location metadata
  fs.writeFileSync(
    path.join(rawDir, "location.json"),
    JSON.stringify({ lat: result.location.lat, lng: result.location.lng, panoId: result.panoId }, null, 2)
  );

  console.log(`Saved ${result.images.length} images to pipeline/data/raw/`);
}

main().catch((err) => { console.error(err); process.exit(1); });
