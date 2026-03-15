#!/usr/bin/env npx tsx
/**
 * Expand raw Street View images with Nano Banana (Gemini).
 * Reads from pipeline/data/raw/, writes to pipeline/data/expanded/.
 * Usage: npx tsx pipeline/scripts/expand-images.ts [--skip] [--aspect 16:9]
 *
 * --skip  Skip expansion if GOOGLE_API_KEY not set (copy raw to expanded)
 * --aspect  Aspect ratio for expansion (default 16:9)
 */
import "../env.js";
import { expandImage } from "../nano-banana.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rawDir = path.resolve(__dirname, "../data/raw");
const expandedDir = path.resolve(__dirname, "../data/expanded");

function parseArgs(): { skip: boolean; aspect: "16:9" | "21:9" | "match_input_image" } {
  const args = process.argv.slice(2);
  const skip = args.includes("--skip");
  const aspectIdx = args.indexOf("--aspect");
  let aspect: "16:9" | "21:9" | "match_input_image" = "16:9";
  if (aspectIdx >= 0 && args[aspectIdx + 1]) {
    const v = args[aspectIdx + 1];
    if (v === "16:9" || v === "21:9" || v === "match_input_image") aspect = v;
  }
  return { skip, aspect };
}

async function main() {
  const { skip, aspect } = parseArgs();
  fs.mkdirSync(expandedDir, { recursive: true });

  const files = fs.readdirSync(rawDir).filter((f) =>
    /\.(jpg|jpeg|png|webp)$/i.test(f)
  );
  if (files.length === 0) {
    console.log("No images in pipeline/data/raw/. Run pipeline:fetch first.");
    return;
  }

  const hasToken = !!process.env.GOOGLE_API_KEY;
  if (!hasToken && skip) {
    console.log("GOOGLE_API_KEY not set (--skip). Copying raw to expanded.");
    for (const f of files) {
      const src = path.join(rawDir, f);
      const dest = path.join(expandedDir, f.replace(/\.[^.]+$/, ".jpg"));
      fs.copyFileSync(src, dest);
      console.log(`  Copied: ${f} -> ${path.basename(dest)}`);
    }
    return;
  }

  if (!hasToken) {
    console.error("GOOGLE_API_KEY required. Add to .env or use --skip.");
    process.exit(1);
  }

  console.log(`Expanding ${files.length} image(s) with aspect ${aspect}...`);
  for (const f of files) {
    const srcPath = path.join(rawDir, f);
    const buf = fs.readFileSync(srcPath);
    const base = path.basename(f, path.extname(f));
    try {
      const result = await expandImage({
        image: buf,
        aspectRatio: aspect,
        resolution: "1K",
      });
      const destPath = path.join(expandedDir, `${base}_expanded.jpg`);
      fs.writeFileSync(destPath, result.imageBuffer);
      console.log(`  OK: ${f} -> ${path.basename(destPath)}`);
    } catch (err) {
      console.error(`  FAIL: ${f}`, err);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
