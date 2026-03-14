#!/usr/bin/env npx tsx
/**
 * Fetch Street View images for given coordinates.
 * Usage: npx tsx pipeline/scripts/fetch-street-view.ts --lat 40.7128 --lng -74.0060
 *        npx tsx pipeline/scripts/fetch-street-view.ts --lat 40.7128 --lng -74.0060 --headings 0,90,180,270
 */
import "../env.js";
import { fetchStreetViewImage } from "../street-view/index.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rawDir = path.resolve(__dirname, "../data/raw");

const DEFAULT_HEADINGS = [0, 90, 180, 270];

function parseArgs(): { lat: number; lng: number; headings: number[] } {
  const args = process.argv.slice(2);
  const get = (k: string) => {
    const i = args.indexOf(k);
    return i >= 0 && args[i + 1] ? args[i + 1] : null;
  };
  const lat = get("--lat");
  const lng = get("--lng");
  const headingsStr = get("--headings");
  if (!lat || !lng) {
    console.error("Usage: npx tsx pipeline/scripts/fetch-street-view.ts --lat <lat> --lng <lng> [--headings 0,90,180,270]");
    process.exit(1);
  }
  const headings = headingsStr
    ? headingsStr.split(",").map((h) => parseInt(h.trim(), 10)).filter((h) => !isNaN(h))
    : DEFAULT_HEADINGS;
  return {
    lat: parseFloat(lat),
    lng: parseFloat(lng),
    headings: headings.length > 0 ? headings : DEFAULT_HEADINGS,
  };
}

async function main() {
  const opts = parseArgs();
  fs.mkdirSync(rawDir, { recursive: true });

  const ts = Date.now();
  for (let i = 0; i < opts.headings.length; i++) {
    const heading = opts.headings[i];
    const result = await fetchStreetViewImage({
      lat: opts.lat,
      lng: opts.lng,
      heading,
    });
    const filename = `streetview_${opts.lat}_${opts.lng}_${heading}deg_${ts}.jpg`;
    const filepath = path.join(rawDir, filename);
    fs.writeFileSync(filepath, result.imageBuffer);
    console.log(`  [${i + 1}/${opts.headings.length}] heading ${heading}° -> ${filename}`);
  }
  console.log(`Saved ${opts.headings.length} image(s) to ${rawDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
