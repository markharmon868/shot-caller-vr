#!/usr/bin/env npx tsx
/**
 * Prepare pipeline output for world model generation.
 * Copies expanded images (or raw if no expanded) to pipeline/data/output/.
 * Usage: npx tsx pipeline/scripts/prepare-output.ts
 */
import "../env.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const expandedDir = path.resolve(__dirname, "../data/expanded");
const rawDir = path.resolve(__dirname, "../data/raw");
const outputDir = path.resolve(__dirname, "../data/output");

async function main() {
  fs.mkdirSync(outputDir, { recursive: true });

  const expanded = fs.existsSync(expandedDir)
    ? fs.readdirSync(expandedDir).filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f))
    : [];
  const raw = fs.existsSync(rawDir)
    ? fs.readdirSync(rawDir).filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f))
    : [];

  const sourceDir = expanded.length > 0 ? expandedDir : rawDir;
  const files = expanded.length > 0 ? expanded : raw;
  const label = expanded.length > 0 ? "expanded" : "raw";

  if (files.length === 0) {
    console.log("No images to copy. Run pipeline:fetch first.");
    return;
  }

  console.log(`Copying ${files.length} ${label} image(s) to output/...`);
  for (const f of files) {
    const src = path.join(sourceDir, f);
    const dest = path.join(outputDir, f);
    fs.copyFileSync(src, dest);
    console.log(`  ${f}`);
  }
  console.log(`Done. Output ready at pipeline/data/output/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
