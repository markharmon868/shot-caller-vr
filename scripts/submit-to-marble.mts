/**
 * Submits pre-downloaded images from /tmp/nm-raw directly to Marble.
 * No pipeline abstraction — reads files directly.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, "../.env") });

const BASE_URL = "https://api.worldlabs.ai";
const API_KEY = process.env.MARBLE_LABS_API_KEY!;
const IMAGE_DIR = "/tmp/nm-raw";
const OUTPUT_SPZ = path.resolve(__dirname, "../public/splats/scene-orlando-v2.spz");
const OUTPUT_COLLIDER = path.resolve(__dirname, "../public/splats/scene-orlando-v2-collider.glb");
const OUTPUT_META = path.resolve(__dirname, "../public/splats/scene-orlando-v2-meta.json");
const SCENE_FILE = path.resolve(__dirname, "../public/scenes/ORLANDO.world.json");

if (!API_KEY) throw new Error("MARBLE_LABS_API_KEY not set");

const imageFiles = fs.readdirSync(IMAGE_DIR).filter(f => f.endsWith(".jpg")).sort();
console.log(`Found ${imageFiles.length} images in ${IMAGE_DIR}:`);
imageFiles.forEach(f => console.log("  ", f));

async function uploadImage(filePath: string): Promise<string> {
  const filename = path.basename(filePath);
  const imageBytes = fs.readFileSync(filePath);
  console.log(`  Preparing upload for ${filename} (${imageBytes.length} bytes)...`);

  const prepRes = await fetch(`${BASE_URL}/marble/v1/media-assets:prepare_upload`, {
    method: "POST",
    headers: { "WLT-Api-Key": API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ file_name: filename, kind: "image", extension: "jpg" }),
  });
  if (!prepRes.ok) throw new Error(`prepare_upload failed: ${prepRes.status} ${await prepRes.text()}`);
  const prep = await prepRes.json() as any;

  const { media_asset_id } = prep.media_asset;
  const { upload_url, upload_method, required_headers } = prep.upload_info;

  const putRes = await fetch(upload_url, {
    method: upload_method ?? "PUT",
    headers: { ...required_headers, "Content-Length": String(imageBytes.length) },
    body: imageBytes,
  });
  if (!putRes.ok) throw new Error(`PUT failed: ${putRes.status} ${await putRes.text()}`);
  return media_asset_id;
}

async function main() {
  console.log("\n=== Uploading images to Marble ===");
  const inputs: any[] = [];

  for (let i = 0; i < imageFiles.length; i++) {
    const f = imageFiles[i];
    const match = f.match(/^sv_h(\d+)_p/);
    const azimuth = match ? parseInt(match[1], 10) : undefined;
    await new Promise(r => setTimeout(r, 600)); // rate limit
    const media_asset_id = await uploadImage(path.join(IMAGE_DIR, f));
    console.log(`  [${i+1}/${imageFiles.length}] ${f} → ${media_asset_id} (azimuth: ${azimuth}°)`);
    const inp: any = { type: "image", source: "media_asset", media_asset_id };
    if (azimuth !== undefined) inp.azimuth_degrees = azimuth;
    inputs.push(inp);
  }

  console.log("\n=== Submitting generation job ===");
  const genRes = await fetch(`${BASE_URL}/marble/v1/worlds:generate`, {
    method: "POST",
    headers: { "WLT-Api-Key": API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      display_name: "shot-caller-orlando-nm-v2",
      world_prompt: { type: "text", text_prompt: "9301 Orlando Pl NE, Albuquerque, New Mexico. Suburban residential street." },
      model: "Marble 0.1-plus",
      inputs,
    }),
  });
  if (!genRes.ok) throw new Error(`worlds:generate failed: ${genRes.status} ${await genRes.text()}`);
  const gen = await genRes.json() as any;
  const operationId = gen.operation_id ?? gen.name?.split("/").pop();
  console.log(`  Operation ID: ${operationId}`);

  console.log("\n=== Polling (up to 15 min) ===");
  const deadline = Date.now() + 15 * 60 * 1000;
  let op: any;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 10_000));
    const res = await fetch(`${BASE_URL}/marble/v1/operations/${operationId}`, {
      headers: { "WLT-Api-Key": API_KEY },
    });
    op = await res.json() as any;
    const elapsed = Math.round((Date.now() - (deadline - 15*60*1000)) / 1000);
    process.stdout.write(`\r  ${elapsed}s elapsed — done=${op.done ?? false}     `);
    if (op.done || op.error) break;
  }
  console.log();

  if (op.error) throw new Error(`Marble error: ${JSON.stringify(op.error)}`);
  if (!op.done) throw new Error("Timed out");

  const splats = op.response?.assets?.splats;
  const splatUrl = splats?.spz_urls?.full_res;
  const colliderUrl = op.response?.assets?.mesh?.collider_mesh_url;
  const marbleViewerUrl = op.response?.world_marble_url;
  const worldId = op.response?.world_id ?? op.metadata?.world_id;
  const meta = splats?.semantics_metadata;

  console.log(`  World ID: ${worldId}`);
  console.log(`  Marble URL: ${marbleViewerUrl}`);
  console.log(`  Splat URL: ${splatUrl}`);

  if (!splatUrl) throw new Error("No splat URL in response: " + JSON.stringify(op.response));

  console.log("\n=== Downloading splat ===");
  const splatRes = await fetch(splatUrl, { headers: { "WLT-Api-Key": API_KEY } });
  const finalRes = splatRes.ok ? splatRes : await fetch(splatUrl);
  if (!finalRes.ok) throw new Error(`Download failed: ${finalRes.status}`);
  fs.writeFileSync(OUTPUT_SPZ, Buffer.from(await finalRes.arrayBuffer()));
  console.log(`  Saved: ${OUTPUT_SPZ} (${fs.statSync(OUTPUT_SPZ).size} bytes)`);

  if (colliderUrl) {
    const cRes = await fetch(colliderUrl, { headers: { "WLT-Api-Key": API_KEY } });
    const cFinal = cRes.ok ? cRes : await fetch(colliderUrl);
    fs.writeFileSync(OUTPUT_COLLIDER, Buffer.from(await cFinal.arrayBuffer()));
    console.log(`  Collider: ${OUTPUT_COLLIDER}`);
  }

  fs.writeFileSync(OUTPUT_META, JSON.stringify({ worldId, marbleViewerUrl, metricScaleFactor: meta?.metric_scale_factor, groundPlaneOffset: meta?.ground_plane_offset }, null, 2));

  // Update ORLANDO.world.json to use v2 splat
  const worldJson = JSON.parse(fs.readFileSync(SCENE_FILE, "utf-8"));
  worldJson.splatUrl = "/splats/scene-orlando-v2.spz";
  worldJson.colliderUrl = colliderUrl ? "/splats/scene-orlando-v2-collider.glb" : "builtin://floor";
  fs.writeFileSync(SCENE_FILE, JSON.stringify(worldJson, null, 2));
  console.log(`  Updated ORLANDO.world.json`);

  console.log(`\n✓ Done!`);
  console.log(`  Marble viewer: ${marbleViewerUrl}`);
  console.log(`  Editor URL: /?mode=editor&scene=ORLANDO&splat=./splats/scene-orlando-v2.spz`);
}

main().catch(e => { console.error(e); process.exit(1); });
