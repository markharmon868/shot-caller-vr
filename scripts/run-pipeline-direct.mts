/**
 * Standalone pipeline runner — bypasses the server entirely.
 * Fetches Street View images for a given pano_id and submits to Marble.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { fetchStreetViewImages } from "../pipeline/street-view/index.js";
import { generateSplat, pollOperation, downloadFile } from "../pipeline/world-model/marble.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- Config ---
const LAT = 35.12571370000001;
const LNG = -106.5390376;
const SCENE_ID = "ORLANDO";
const DISPLAY_NAME = `shot-caller-orlando-nm`;

const RAW_DIR = path.resolve(__dirname, "../pipeline/data/raw/orlando-nm");
const PUBLIC_SPLATS = path.resolve(__dirname, "../public/splats");
const PUBLIC_SCENES = path.resolve(__dirname, "../public/scenes");

async function main() {
  // Load env
  const { config } = await import("dotenv");
  config({ path: path.resolve(__dirname, "../.env") });

  console.log(`\n[Direct Pipeline] Location: ${LAT}, ${LNG}`);
  console.log(`[Direct Pipeline] Scene ID: ${SCENE_ID}\n`);

  // Step 1: Download Street View images
  console.log("Step 1: Fetching Street View images...");
  fs.mkdirSync(RAW_DIR, { recursive: true });
  // Clean any old images
  for (const f of fs.readdirSync(RAW_DIR)) {
    if (f.endsWith(".jpg")) fs.unlinkSync(path.join(RAW_DIR, f));
  }

  const sv = await fetchStreetViewImages({ lat: LAT, lng: LNG });
  console.log(`  Pano ID: ${sv.panoId}`);
  console.log(`  Actual location: ${sv.location.lat.toFixed(6)}, ${sv.location.lng.toFixed(6)}`);

  for (const img of sv.images) {
    const filename = `sv_h${img.heading}_p${img.pitch}.jpg`;
    fs.writeFileSync(path.join(RAW_DIR, filename), img.buffer);
  }
  console.log(`  Saved ${sv.images.length} images to ${RAW_DIR}\n`);

  // Step 2: Submit to Marble
  console.log("Step 2: Uploading to Marble Labs...");
  const imageFiles = fs.readdirSync(RAW_DIR).filter((f) => /\.jpg$/i.test(f)).sort();
  const images = imageFiles.map((f) => {
    const match = f.match(/^sv_h(\d+)_p/);
    return { imagePath: path.join(RAW_DIR, f), azimuthDegrees: match ? parseInt(match[1], 10) : undefined };
  });

  const operationId = await generateSplat({
    images,
    displayName: DISPLAY_NAME,
    model: "Marble 0.1-plus",
    onProgress: (msg) => process.stdout.write(msg),
  });
  console.log(`  Operation ID: ${operationId}\n`);

  // Step 3: Poll
  console.log("Step 3: Waiting for Marble generation (~5 min)...");
  const op = await pollOperation(operationId, {
    intervalMs: 10_000,
    timeoutMs: 15 * 60 * 1000,
    onProgress: (msg) => process.stdout.write(msg),
  });
  console.log();

  if (op.error || !op.splatUrlFull) {
    console.error("Marble error:", op.error);
    process.exit(1);
  }

  // Step 4: Download
  console.log("\nStep 4: Downloading outputs...");
  fs.mkdirSync(PUBLIC_SPLATS, { recursive: true });
  const splatFilename = `scene-orlando.spz`;
  const colliderFilename = `scene-orlando-collider.glb`;

  await downloadFile(op.splatUrlFull, path.join(PUBLIC_SPLATS, splatFilename));
  console.log(`  Splat saved: ${splatFilename}`);

  if (op.colliderUrl) {
    await downloadFile(op.colliderUrl, path.join(PUBLIC_SPLATS, colliderFilename));
    console.log(`  Collider saved: ${colliderFilename}`);
  }

  fs.writeFileSync(
    path.join(PUBLIC_SPLATS, `scene-orlando-meta.json`),
    JSON.stringify({ worldId: op.worldId, marbleViewerUrl: op.marbleViewerUrl, metricScaleFactor: op.metricScaleFactor, groundPlaneOffset: op.groundPlaneOffset }, null, 2)
  );

  // Step 5: Write scene JSON
  fs.mkdirSync(PUBLIC_SCENES, { recursive: true });
  const worldJson = {
    sceneId: SCENE_ID,
    version: 1,
    unit: "meters",
    splatUrl: `/splats/${splatFilename}`,
    colliderUrl: op.colliderUrl ? `/splats/${colliderFilename}` : "builtin://floor",
    assetCatalogUrl: `/scenes/demo.assets.json`,
    worldBounds: { min: [-8, 0, -8], max: [8, 4, 8] },
  };
  fs.writeFileSync(path.join(PUBLIC_SCENES, `${SCENE_ID}.world.json`), JSON.stringify(worldJson, null, 2));
  fs.writeFileSync(path.join(PUBLIC_SCENES, `${SCENE_ID}.scene.json`), JSON.stringify({
    sceneId: SCENE_ID, version: 1, worldVersion: 1, revision: 1, status: "draft",
    elements: [], reviewIssues: [],
    approval: { status: "pending", reviewer: "", decidedAt: "", sceneRevision: 1, note: "" },
    exportState: { status: "idle", lastCaptureDataUrl: "", requestedAt: "", lastPayload: "" },
  }, null, 2));

  const assetsJson = path.join(PUBLIC_SCENES, "demo.assets.json");
  if (fs.existsSync(assetsJson)) {
    fs.copyFileSync(assetsJson, path.join(PUBLIC_SCENES, `${SCENE_ID}.assets.json`));
  }

  // Clean up raw
  fs.rmSync(RAW_DIR, { recursive: true, force: true });

  console.log(`\n✓ Done!`);
  console.log(`  Splat:   public/splats/${splatFilename}`);
  console.log(`  Scene:   /?mode=editor&scene=${SCENE_ID}&splat=./splats/${splatFilename}`);
  console.log(`  Marble:  ${op.marbleViewerUrl}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
