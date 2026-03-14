/**
 * Nano Banana 2 — image expansion via Replicate.
 *
 * Expands Street View images for better world model input.
 * https://replicate.com/google/nano-banana-2
 */

import Replicate from "replicate";

export type AspectRatio =
  | "match_input_image"
  | "1:1"
  | "2:3"
  | "3:2"
  | "3:4"
  | "4:3"
  | "4:5"
  | "5:4"
  | "9:16"
  | "16:9"
  | "21:9";

export type Resolution = "512" | "1K" | "2K" | "4K";

export interface ExpansionOptions {
  /** Input image buffer. */
  image: Buffer;
  /** Target aspect ratio. Use 16:9 or 21:9 for panorama expansion. */
  aspectRatio?: AspectRatio;
  /** Resolution. Default "1K". */
  resolution?: Resolution;
  /** Prompt for expansion context. */
  prompt?: string;
  /** Output format. */
  outputFormat?: "jpg" | "png";
}

export interface ExpansionResult {
  imageBuffer: Buffer;
  metadata?: Record<string, unknown>;
}

const DEFAULT_PROMPT =
  "Expand this street view image to show more of the surroundings. Maintain photorealistic style and seamless continuity with the original scene.";

/**
 * Expand an image using Nano Banana 2 on Replicate.
 * Requires REPLICATE_API_TOKEN in env.
 */
export async function expandImage(
  options: ExpansionOptions
): Promise<ExpansionResult> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    throw new Error(
      "REPLICATE_API_TOKEN is required. Add to .env (get one at replicate.com/account)"
    );
  }

  const replicate = new Replicate({ auth: token });
  const dataUri = `data:image/jpeg;base64,${options.image.toString("base64")}`;

  const output = await replicate.run("google/nano-banana-2", {
    input: {
      prompt: options.prompt ?? DEFAULT_PROMPT,
      image_input: [dataUri],
      aspect_ratio: options.aspectRatio ?? "16:9",
      resolution: options.resolution ?? "1K",
      output_format: options.outputFormat ?? "jpg",
    },
  }) as unknown;

  // Replicate returns FileOutput (ReadableStream) or URL; save to buffer
  let imageBuffer: Buffer;
  const getUrl = (o: unknown) =>
    typeof (o as { url?: string }).url === "string"
      ? (o as { url: string }).url
      : typeof (o as { url?: () => string }).url === "function"
        ? (o as { url: () => string }).url()
        : null;

  const url = typeof output === "string" && output.startsWith("http")
    ? output
    : getUrl(output);

  if (url) {
    const res = await fetch(url);
    const ab = await res.arrayBuffer();
    imageBuffer = Buffer.from(ab);
  } else if (output && typeof (output as Blob).arrayBuffer === "function") {
    const ab = await (output as Blob).arrayBuffer();
    imageBuffer = Buffer.from(ab);
  } else if (Buffer.isBuffer(output)) {
    imageBuffer = output;
  } else {
    throw new Error(`Unexpected Replicate output: ${typeof output}`);
  }

  return {
    imageBuffer,
    metadata: {},
  };
}
