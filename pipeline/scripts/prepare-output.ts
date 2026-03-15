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
const generatedDir = path.resolve(__dirname, "../data/generated");
const expandedDir = path.resolve(__dirname, "../data/expanded");
const rawDir = path.resolve(__dirname, "../data/raw");
const outputDir = path.resolve(__dirname, "../data/output");

function listImages(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f));
}

async function main() {
  fs.mkdirSync(outputDir, { recursive: true });

  // Priority: generated (Nano Banana Pro) > expanded (Nano Banana 2) > raw (Street View)
  const generated = listImages(generatedDir);
  const expanded = listImages(expandedDir);
  const raw = listImages(rawDir);

  let sourceDir: string;
  let files: string[];
  let label: string;

  if (generated.length > 0) {
    sourceDir = generatedDir;
    files = generated;
    label = "generated";
  } else if (expanded.length > 0) {
    sourceDir = expandedDir;
    files = expanded;
    label = "expanded";
  } else {
    sourceDir = rawDir;
    files = raw;
    label = "raw";
  }

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
