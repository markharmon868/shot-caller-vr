/**
 * Nano Banana 2.5 — image expansion/outpainting.
 *
 * Expands Street View images for better world model input.
 * Supports expanded resolution (512px–4K), aspect ratios 1:4, 4:1, 1:8, 8:1.
 *
 * Options:
 * - Replicate: https://replicate.com/google/nano-banana
 * - Vertex AI / Google AI Studio
 */

export interface ExpansionOptions {
  /** Input image buffer (base64 or path). */
  image: Buffer | string;
  /** Target aspect ratio, e.g. "4:1" for panorama. */
  aspectRatio?: "1:1" | "1:4" | "4:1" | "1:8" | "8:1";
  /** Prompt for expansion direction/context. */
  prompt?: string;
}

export interface ExpansionResult {
  imageBuffer: Buffer;
  /** Metadata passed through from input. */
  metadata?: Record<string, unknown>;
}

/**
 * Expand an image using Nano Banana 2.5.
 * Requires REPLICATE_API_TOKEN or equivalent for the chosen provider.
 *
 * TODO: Implement Replicate / Vertex AI client.
 */
export async function expandImage(
  options: ExpansionOptions
): Promise<ExpansionResult> {
  // Placeholder — wire to Replicate or Google API when ready
  const token = process.env.REPLICATE_API_TOKEN ?? process.env.GOOGLE_AI_API_KEY;
  if (!token) {
    throw new Error(
      "REPLICATE_API_TOKEN or GOOGLE_AI_API_KEY required for image expansion"
    );
  }

  // Stub: return input unchanged until integration is added
  const imageBuffer =
    typeof options.image === "string"
      ? Buffer.from(options.image, "base64")
      : options.image;

  return {
    imageBuffer,
    metadata: {},
  };
}
