/**
 * World Labs Marble API client — images → Gaussian splat (.spz)
 *
 * Auth: WLT-Api-Key header
 * Base: https://api.worldlabs.ai
 *
 * Flow:
 *   For each image → POST /marble/v1/media-assets:prepare_upload → PUT to signed URL
 *   POST /marble/v1/worlds:generate with all media_asset_ids + azimuth angles
 *   Poll GET /marble/v1/operations/{operation_id} until done
 *   Download the full-resolution .spz from the response assets
 */

import fs from "fs";
import path from "path";

const BASE_URL = "https://api.worldlabs.ai";

function authHeaders(): Record<string, string> {
  const key = process.env.MARBLE_LABS_API_KEY;
  if (!key) throw new Error("MARBLE_LABS_API_KEY not set. Add it to .env");
  return { "WLT-Api-Key": key };
}

// ---------------------------------------------------------------------------
// Step 1: Upload a single image, return its media_asset_id
// ---------------------------------------------------------------------------

export async function uploadImage(imagePath: string): Promise<string> {
  const filename = path.basename(imagePath);
  const ext = path.extname(filename).replace(".", "").toLowerCase() || "jpg";

  // Get a signed upload URL
  const prepRes = await fetch(`${BASE_URL}/marble/v1/media-assets:prepare_upload`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ file_name: filename, kind: "image", extension: ext }),
  });
  if (!prepRes.ok) {
    throw new Error(`prepare_upload failed for ${filename}: ${prepRes.status} ${await prepRes.text()}`);
  }
  const prep = await prepRes.json() as {
    media_asset: { media_asset_id: string };
    upload_info: { upload_url: string; upload_method: string; required_headers: Record<string, string> };
  };

  const { media_asset_id } = prep.media_asset;
  const { upload_url, upload_method, required_headers } = prep.upload_info;

  // PUT the image bytes to the signed URL
  const imageBytes = fs.readFileSync(imagePath);
  const putRes = await fetch(upload_url, {
    method: upload_method ?? "PUT",
    headers: { ...required_headers, "Content-Length": String(imageBytes.length) },
    body: imageBytes,
  });
  if (!putRes.ok) {
    throw new Error(`Upload PUT failed for ${filename}: ${putRes.status} ${await putRes.text()}`);
  }

  return media_asset_id;
}

// ---------------------------------------------------------------------------
// Step 2: Submit a world generation job
// ---------------------------------------------------------------------------

export interface MarbleImageInput {
  imagePath: string;
  /** Azimuth in degrees: 0=front, 90=right, 180=back, 270=left. Matches Street View heading. */
  azimuthDegrees?: number;
}

export interface MarbleGenerateOptions {
  images: MarbleImageInput[];
  displayName?: string;
  worldPrompt?: string;
  /** "Marble 0.1-plus" (best quality, ~5 min) or "Marble 0.1-mini" (fast, ~30-45s) */
  model?: "Marble 0.1-plus" | "Marble 0.1-mini";
  onProgress?: (msg: string) => void;
}

export async function generateSplat(options: MarbleGenerateOptions): Promise<string> {
  const log = options.onProgress ?? ((m: string) => process.stdout.write(m));
  const model = options.model ?? "Marble 0.1-plus";

  // Upload all images
  log(`Uploading ${options.images.length} images to Marble Labs...\n`);
  const uploadedInputs: Array<{ type: string; source: string; media_asset_id: string; azimuth_degrees?: number }> = [];

  for (let i = 0; i < options.images.length; i++) {
    const { imagePath, azimuthDegrees } = options.images[i];
    log(`\r  Uploading ${i + 1}/${options.images.length}: ${path.basename(imagePath)}`);
    if (i > 0) await new Promise((r) => setTimeout(r, 600)); // avoid 429
    const media_asset_id = await uploadImage(imagePath);
    const input: typeof uploadedInputs[0] = { type: "image", source: "media_asset", media_asset_id };
    if (azimuthDegrees !== undefined) input.azimuth_degrees = azimuthDegrees;
    uploadedInputs.push(input);
  }
  log("\n");

  // Submit world generation
  log(`Submitting world generation job (model: ${model})...\n`);
  const genRes = await fetch(`${BASE_URL}/marble/v1/worlds:generate`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({
      display_name: options.displayName ?? "shot-caller-scene",
      world_prompt: { type: "text", text_prompt: options.worldPrompt ?? "A real-world location captured from Street View for film production planning." },
      model,
      inputs: uploadedInputs,
    }),
  });
  if (!genRes.ok) {
    throw new Error(`worlds:generate failed: ${genRes.status} ${await genRes.text()}`);
  }
  const gen = await genRes.json() as { operation_id?: string; name?: string };
  const operationId = gen.operation_id ?? gen.name?.split("/").pop();
  if (!operationId) throw new Error(`No operation_id in response: ${JSON.stringify(gen)}`);

  log(`  Operation ID: ${operationId}\n`);
  return operationId;
}

// ---------------------------------------------------------------------------
// Step 3: Poll operation until done
// ---------------------------------------------------------------------------

export interface MarbleOperation {
  done: boolean;
  splatUrlFull?: string;
  splatUrl500k?: string;
  splatUrl100k?: string;
  colliderUrl?: string;
  /** Scale factor to apply to the splat mesh (from Marble semantics_metadata) */
  metricScaleFactor?: number;
  /** Y offset for ground plane alignment */
  groundPlaneOffset?: number;
  worldId?: string;
  marbleViewerUrl?: string;
  error?: string;
}

export async function pollOperation(
  operationId: string,
  opts: { intervalMs?: number; timeoutMs?: number; onProgress?: (msg: string) => void } = {}
): Promise<MarbleOperation> {
  const intervalMs = opts.intervalMs ?? 10_000;
  const timeoutMs = opts.timeoutMs ?? 15 * 60 * 1000; // 15 min
  const log = opts.onProgress ?? ((m: string) => process.stdout.write(m));
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const res = await fetch(`${BASE_URL}/marble/v1/operations/${operationId}`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error(`Poll failed: ${res.status} ${await res.text()}`);

    const op = await res.json() as {
      done?: boolean;
      error?: { message?: string } | null;
      metadata?: { world_id?: string };
      response?: {
        world_id?: string;
        world_marble_url?: string;
        assets?: {
          splats?: {
            spz_urls?: { full_res?: string; "500k"?: string; "100k"?: string };
            semantics_metadata?: { metric_scale_factor?: number; ground_plane_offset?: number };
          };
          mesh?: { collider_mesh_url?: string };
        };
      };
    };

    if (op.error) {
      return { done: true, error: JSON.stringify(op.error) };
    }

    if (op.done) {
      const splats = op.response?.assets?.splats;
      const meta = splats?.semantics_metadata;
      return {
        done: true,
        splatUrlFull: splats?.spz_urls?.full_res,
        splatUrl500k: splats?.spz_urls?.["500k"],
        splatUrl100k: splats?.spz_urls?.["100k"],
        colliderUrl: op.response?.assets?.mesh?.collider_mesh_url,
        metricScaleFactor: meta?.metric_scale_factor,
        groundPlaneOffset: meta?.ground_plane_offset,
        worldId: op.response?.world_id ?? op.metadata?.world_id,
        marbleViewerUrl: op.response?.world_marble_url,
      };
    }

    log(`\r  Waiting for Marble job... (${Math.round((deadline - Date.now()) / 60000)}m remaining)`);
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  return { done: true, error: "Timed out waiting for Marble operation" };
}

// ---------------------------------------------------------------------------
// Step 4: Download a URL to a local file
// ---------------------------------------------------------------------------

export async function downloadFile(url: string, destPath: string): Promise<void> {
  // Try with auth first; signed CDN URLs typically don't need it but harmless to include
  const res = await fetch(url, { headers: authHeaders() });
  const finalRes = res.ok ? res : await fetch(url);
  if (!finalRes.ok) throw new Error(`Download failed: ${finalRes.status} ${url}`);

  const buffer = Buffer.from(await finalRes.arrayBuffer());
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, buffer);
}
