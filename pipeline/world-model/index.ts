/**
 * World model generation — images → Gaussian splat (.spz)
 *
 * Options:
 * - World Labs Marble: https://docs.worldlabs.ai/marble — text/world gen, exports .spz
 * - Luma AI: https://lumalabs.ai — 3D from video/multi-view, outputs 3D scenes
 * - Polycam, etc.
 *
 * Pipeline output images (pipeline/data/output/) are input for these services.
 * TODO: Integrate Marble or Luma API when credentials available.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface WorldModelOptions {
  /** Path to output directory with images. */
  inputDir?: string;
  /** Output path for .spz file. */
  outputPath?: string;
  /** Service: marble | luma (stub). */
  provider?: "marble" | "luma";
}

export interface WorldModelResult {
  success: boolean;
  splatPath?: string;
  error?: string;
}

/**
 * Generate a Gaussian splat from pipeline output images.
 * Stub — wire to Marble/Luma API when ready.
 */
export async function generateWorldModel(
  options: WorldModelOptions = {}
): Promise<WorldModelResult> {
  const inputDir = options.inputDir ?? path.resolve(__dirname, "../data/output");
  const outputPath = options.outputPath ?? path.resolve(__dirname, "../../public/splats/generated.spz");

  if (!fs.existsSync(inputDir)) {
    return { success: false, error: `Input dir not found: ${inputDir}` };
  }

  const images = fs.readdirSync(inputDir).filter((f) =>
    /\.(jpg|jpeg|png|webp)$/i.test(f)
  );
  if (images.length === 0) {
    return { success: false, error: "No images in pipeline/data/output. Run pipeline first." };
  }

  // Stub: no API integration yet
  const provider = options.provider ?? "marble";
  return {
    success: false,
    error: `${provider} integration TODO. Upload images manually to World Labs Marble or Luma, then export .spz to public/splats/`,
  };
}
