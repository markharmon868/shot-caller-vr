#!/usr/bin/env npx tsx
/**
 * Submit pipeline/data/raw images to Marble Labs and download the .spz output.
 *
 * Usage:
 *   npx tsx pipeline/scripts/generate-splat.ts
 *   npx tsx pipeline/scripts/generate-splat.ts --out public/splats/my-scene.spz --model mini
 *
 * Requires MARBLE_LABS_API_KEY in .env.
 */
import "../env.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { generateSplat, pollOperation, downloadFile } from "../world-model/marble.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rawDir = path.resolve(__dirname, "../data/raw");
const defaultOut = path.resolve(__dirname, "../../public/splats/generated.spz");

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (k: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
  return {
    outPath: get("--out") ?? defaultOut,
    model: get("--model") === "mini" ? "Marble 0.1-mini" as const : "Marble 0.1-plus" as const,
    resolution: (get("--res") ?? "full") as "full" | "500k" | "100k",
  };
}

async function main() {
  const { outPath, model, resolution } = parseArgs();

  // Collect images — filenames encode heading as sv_h{heading}_p{pitch}.jpg
  const imageFiles = fs
    .readdirSync(rawDir)
    .filter((f) => /^sv_h\d+_p/.test(f) && /\.jpg$/i.test(f))
    .sort();

  if (imageFiles.length === 0) {
    console.error("No Street View images in pipeline/data/raw. Run fetch-street-view.ts first.");
    process.exit(1);
  }

  // Parse azimuth from filename (Street View heading == Marble azimuth)
  const images = imageFiles.map((f) => {
    const match = f.match(/^sv_h(\d+)_p/);
    return { imagePath: path.join(rawDir, f), azimuthDegrees: match ? parseInt(match[1], 10) : undefined };
  });

  const operationId = await generateSplat({ images, model });

  console.log(`Polling for completion (~5 min for Marble 0.1-plus, ~45s for mini)...`);
  const op = await pollOperation(operationId);
  process.stdout.write("\n");

  if (op.error) {
    console.error(`Generation failed: ${op.error}`);
    process.exit(1);
  }

  const splatUrl = resolution === "500k" ? op.splatUrl500k
    : resolution === "100k" ? op.splatUrl100k
    : op.splatUrlFull;

  if (!splatUrl) {
    console.error("No .spz URL in response. Full response:", JSON.stringify(op, null, 2));
    process.exit(1);
  }

  console.log(`Downloading ${resolution === "full" ? "full-res" : resolution} .spz → ${outPath}`);
  await downloadFile(splatUrl, outPath);

  // Also download the GLB collider mesh if available
  if (op.colliderUrl) {
    const colliderPath = outPath.replace(/\.spz$/, "-collider.glb");
    console.log(`Downloading collider → ${colliderPath}`);
    await downloadFile(op.colliderUrl, colliderPath);
  }

  // Save metadata alongside the splat — useful for placing it correctly in the scene
  const metaPath = outPath.replace(/\.spz$/, "-meta.json");
  fs.writeFileSync(metaPath, JSON.stringify({
    worldId: op.worldId,
    marbleViewerUrl: op.marbleViewerUrl,
    metricScaleFactor: op.metricScaleFactor,
    groundPlaneOffset: op.groundPlaneOffset,
    urls: {
      fullRes: op.splatUrlFull,
      "500k": op.splatUrl500k,
      "100k": op.splatUrl100k,
      collider: op.colliderUrl,
    },
  }, null, 2));
  console.log(`Saved metadata → ${metaPath}`);

  const splatName = path.basename(outPath);
  console.log(`\nDone! Load in the editor:`);
  console.log(`  https://localhost:8082/?splat=./splats/${splatName}`);
  if (op.marbleViewerUrl) console.log(`  Marble viewer: ${op.marbleViewerUrl}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
