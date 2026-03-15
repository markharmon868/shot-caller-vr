/**
 * World Labs Marble API — images → Gaussian splat (.spz)
 *
 * Supports both single-image and multi-image modes.
 * Default: multi-image with 4 azimuth angles for better 3D reconstruction.
 *
 * API docs: https://docs.worldlabs.ai/marble
 * Auth: WLT-Api-Key header
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MARBLE_BASE = "https://api.worldlabs.ai/marble/v1";

export interface WorldModelOptions {
  /** Path to output directory with images (for multi-image mode). */
  inputDir?: string;
  /** Output path for .spz file. */
  outputPath?: string;
  /** Service provider. */
  provider?: "marble" | "luma";
  /** Single image path (fallback mode). */
  imagePath?: string;
  /** Multi-image paths ordered [front, right, back, left]. */
  imagePaths?: string[];
  /** Model tier: mini (~30s, 250 credits) or plus (~5min, 1600 credits). */
  model?: "mini" | "plus";
}

export interface WorldModelResult {
  success: boolean;
  splatPath?: string;
  worldId?: string;
  error?: string;
}

function getApiKey(): string {
  const key = process.env.WORLD_LABS_API_KEY;
  if (!key) {
    throw new Error(
      "WORLD_LABS_API_KEY is required. Add to .env (get one at worldlabs.ai)"
    );
  }
  return key;
}

function marbleHeaders(): Record<string, string> {
  return {
    "WLT-Api-Key": getApiKey(),
    "Content-Type": "application/json",
  };
}

/** Trusted hosts for upload/download URLs returned by the Marble API. */
const TRUSTED_UPLOAD_HOSTS = ["storage.googleapis.com", "storage.cloud.google.com"];
const TRUSTED_CDN_HOSTS = [...TRUSTED_UPLOAD_HOSTS, "cdn.worldlabs.ai"];
const ALLOWED_UPLOAD_METHODS = new Set(["PUT", "POST"]);

function assertTrustedUrl(url: string, label: string, trustedHosts: string[]): void {
  const parsed = new URL(url);
  const isTrusted = trustedHosts.some(
    (h) => parsed.hostname === h || parsed.hostname.endsWith("." + h)
  );
  if (!isTrusted) {
    throw new Error(`${label} points to untrusted host: ${parsed.hostname}`);
  }
}

/**
 * Upload a single image to Marble and return the media_asset_id.
 */
async function uploadImage(imagePath: string): Promise<string> {
  const imageBuffer = fs.readFileSync(imagePath);
  const ext = path.extname(imagePath).toLowerCase();
  const mimeType =
    ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";

  // Step 1: Prepare upload — get signed URL + media asset ID
  const fileName = path.basename(imagePath);
  const prepRes = await fetch(`${MARBLE_BASE}/media-assets:prepare_upload`, {
    method: "POST",
    headers: marbleHeaders(),
    body: JSON.stringify({
      file_name: fileName,
      content_type: mimeType,
      kind: "image",
    }),
  });

  if (!prepRes.ok) {
    const text = await prepRes.text();
    throw new Error(`Marble prepare_upload failed (${prepRes.status}): ${text}`);
  }

  const prepData = (await prepRes.json()) as {
    media_asset: { media_asset_id: string };
    upload_info: {
      upload_url: string;
      required_headers: Record<string, string>;
      upload_method: string;
    };
  };

  const uploadUrl = prepData.upload_info.upload_url;
  const mediaAssetId = prepData.media_asset.media_asset_id;
  const uploadMethod = prepData.upload_info.upload_method ?? "PUT";

  // Validate the upload URL targets a trusted host
  assertTrustedUrl(uploadUrl, "upload_url", TRUSTED_UPLOAD_HOSTS);
  if (!ALLOWED_UPLOAD_METHODS.has(uploadMethod.toUpperCase())) {
    throw new Error(`Unexpected upload method: ${uploadMethod}`);
  }

  // Step 2: Upload raw image bytes to signed GCS URL
  const uploadRes = await fetch(uploadUrl, {
    method: uploadMethod,
    headers: {
      "Content-Type": mimeType,
      ...prepData.upload_info.required_headers,
    },
    body: imageBuffer,
  });

  if (!uploadRes.ok) {
    const text = await uploadRes.text();
    throw new Error(`Marble image upload failed (${uploadRes.status}): ${text}`);
  }

  return mediaAssetId;
}

/**
 * Generate world from multiple images with azimuth angles.
 */
async function generateMultiImage(
  mediaAssetIds: { id: string; azimuth: number }[],
  modelName: string
): Promise<string> {
  const body = {
    model: modelName,
    world_prompt: {
      type: "multi-image",
      multi_image_prompt: mediaAssetIds.map(({ id, azimuth }) => ({
        azimuth,
        content: {
          source: "media_asset",
          media_asset_id: id,
        },
      })),
    },
  };

  const res = await fetch(`${MARBLE_BASE}/worlds:generate`, {
    method: "POST",
    headers: marbleHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Marble worlds:generate failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as Record<string, unknown>;
  const opId = data.operation_id as string | undefined;
  if (!opId) {
    throw new Error(`Unexpected worlds:generate response (no operation_id): ${JSON.stringify(data).slice(0, 500)}`);
  }
  return opId;
}

/**
 * Generate world from a single image.
 */
async function generateSingleImage(
  mediaAssetId: string,
  modelName: string
): Promise<string> {
  const body = {
    model: modelName,
    world_prompt: {
      type: "image",
      image_prompt: {
        source: "media_asset",
        media_asset_id: mediaAssetId,
      },
    },
  };

  const res = await fetch(`${MARBLE_BASE}/worlds:generate`, {
    method: "POST",
    headers: marbleHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Marble worlds:generate failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as Record<string, unknown>;
  const opId = data.operation_id as string | undefined;
  if (!opId) {
    throw new Error(`Unexpected worlds:generate response (no operation_id): ${JSON.stringify(data).slice(0, 500)}`);
  }
  return opId;
}

interface OperationResult {
  done: boolean;
  metadata?: { world_id?: string };
  error?: { message: string };
}

/**
 * Poll operation until done, printing elapsed time.
 * @param maxWaitMs Maximum time to wait before timing out (default: 10 minutes)
 */
async function pollOperation(operationId: string, maxWaitMs = 600_000): Promise<string> {
  const startTime = Date.now();
  const pollInterval = 15_000; // 15 seconds

  while (true) {
    if (Date.now() - startTime > maxWaitMs) {
      throw new Error(
        `Marble operation ${operationId} timed out after ${(maxWaitMs / 1000).toFixed(0)}s`
      );
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    console.log(`  Generating world... (elapsed: ${elapsed}s)`);

    const res = await fetch(`${MARBLE_BASE}/operations/${operationId}`, {
      headers: marbleHeaders(),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Marble poll failed (${res.status}): ${text}`);
    }

    const op = (await res.json()) as OperationResult;

    if (op.error) {
      throw new Error(`Marble generation error: ${op.error.message}`);
    }

    if (op.done && op.metadata?.world_id) {
      const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`  World generated in ${totalElapsed}s (world_id: ${op.metadata.world_id})`);
      return op.metadata.world_id;
    }

    await new Promise((r) => setTimeout(r, pollInterval));
  }
}

/**
 * Download the .spz file from a completed world.
 */
async function downloadSplat(worldId: string, outputPath: string): Promise<void> {
  const res = await fetch(`${MARBLE_BASE}/worlds/${worldId}`, {
    headers: marbleHeaders(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Marble get world failed (${res.status}): ${text}`);
  }

  const world = (await res.json()) as {
    assets?: {
      splats?: {
        spz_urls?: {
          full_res?: string;
        };
      };
    };
  };

  const spzUrl = world.assets?.splats?.spz_urls?.full_res;
  if (!spzUrl) {
    throw new Error("No .spz URL found in world assets");
  }

  // Validate CDN URL targets a trusted host
  assertTrustedUrl(spzUrl, "spz_url", TRUSTED_CDN_HOSTS);
  console.log(`  Downloading .spz from CDN...`);
  const dlRes = await fetch(spzUrl);
  if (!dlRes.ok) {
    throw new Error(`SPZ download failed (${dlRes.status})`);
  }

  const buffer = Buffer.from(await dlRes.arrayBuffer());
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, buffer);
  console.log(`  Saved: ${outputPath} (${(buffer.length / 1024 / 1024).toFixed(1)} MB)`);
}

/**
 * Generate a Gaussian splat from images using World Labs Marble API.
 */
export async function generateWorldModel(
  options: WorldModelOptions = {}
): Promise<WorldModelResult> {
  const inputDir = options.inputDir ?? path.resolve(__dirname, "../data/output");
  const outputPath =
    options.outputPath ?? path.resolve(__dirname, "../../public/splats/generated.spz");
  const provider = options.provider ?? "marble";

  if (provider !== "marble") {
    return {
      success: false,
      error: `Provider "${provider}" not implemented. Use "marble".`,
    };
  }

  const modelName =
    options.model === "plus" ? "Marble 0.1-plus" : "Marble 0.1-mini";
  const maxWaitMs = options.model === "plus" ? 1_800_000 : 600_000;

  try {
    // Single-image mode
    if (options.imagePath) {
      if (!fs.existsSync(options.imagePath)) {
        return { success: false, error: `Image not found: ${options.imagePath}` };
      }

      console.log(`Uploading image: ${options.imagePath}`);
      const assetId = await uploadImage(options.imagePath);
      console.log(`  Uploaded (asset: ${assetId})`);

      console.log(`Generating world (${modelName}, single-image)...`);
      const opId = await generateSingleImage(assetId, modelName);
      const worldId = await pollOperation(opId, maxWaitMs);
      await downloadSplat(worldId, outputPath);

      return { success: true, splatPath: outputPath, worldId };
    }

    // Multi-image mode
    const azimuths = [0, 90, 180, 270];
    let imagesToUpload: { path: string; azimuth: number }[] = [];

    if (options.imagePaths && options.imagePaths.length > 0) {
      if (options.imagePaths.length > azimuths.length) {
        return {
          success: false,
          error: `Max ${azimuths.length} images supported for multi-image mode`,
        };
      }
      imagesToUpload = options.imagePaths.map((p, i) => ({
        path: p,
        azimuth: azimuths[i],
      }));
    } else {
      // Read from inputDir
      if (!fs.existsSync(inputDir)) {
        return { success: false, error: `Input dir not found: ${inputDir}` };
      }

      const images = fs
        .readdirSync(inputDir)
        .filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f))
        .sort()
        .slice(0, azimuths.length);

      if (images.length === 0) {
        return {
          success: false,
          error: "No images in input directory. Run pipeline first.",
        };
      }

      imagesToUpload = images.map((f, i) => ({
        path: path.join(inputDir, f),
        azimuth: azimuths[i],
      }));
    }

    // Upload all images in parallel
    console.log(`Uploading ${imagesToUpload.length} image(s)...`);
    const mediaAssets = await Promise.all(
      imagesToUpload.map(async (img) => {
        console.log(`  Uploading: ${path.basename(img.path)} (${img.azimuth}°)`);
        const id = await uploadImage(img.path);
        return { id, azimuth: img.azimuth };
      })
    );

    // Generate world
    const isMulti = mediaAssets.length > 1;
    console.log(
      `Generating world (${modelName}, ${isMulti ? "multi-image" : "single-image"})...`
    );

    const opId = isMulti
      ? await generateMultiImage(mediaAssets, modelName)
      : await generateSingleImage(mediaAssets[0].id, modelName);

    const worldId = await pollOperation(opId, maxWaitMs);
    await downloadSplat(worldId, outputPath);

    return { success: true, splatPath: outputPath, worldId };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
