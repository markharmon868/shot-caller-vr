/**
 * SceneSharing — Engelbart principle: Augment collective intelligence
 * Encode scene as a compressed URL parameter for sharing
 */

import type { SceneData } from "./SceneState.js";
import { toast } from "./Toast.js";

/**
 * Encode scene to shareable URL
 * Note: Uses browser's native TextEncoder/CompressionStream when available
 */
export async function encodeSceneToURL(state: SceneData): Promise<string> {
  const json = JSON.stringify(state);

  try {
    // Try using native compression if available
    const compressed = await compressString(json);
    const b64 = btoa(String.fromCharCode(...new Uint8Array(compressed)));
    const url = new URL(window.location.href);
    url.searchParams.set("scene", b64);
    return url.toString();
  } catch (err) {
    console.warn("Compression failed, using uncompressed URL", err);
    // Fallback to uncompressed
    const b64 = btoa(json);
    const url = new URL(window.location.href);
    url.searchParams.set("scene", b64);
    return url.toString();
  }
}

/**
 * Decode scene from URL parameter
 */
export async function decodeSceneFromURL(): Promise<SceneData | null> {
  const params = new URLSearchParams(window.location.search);
  const b64 = params.get("scene");
  if (!b64) return null;

  try {
    // Try decompressing first
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const json = await decompressString(bytes.buffer);
    return JSON.parse(json);
  } catch {
    try {
      // Fallback to uncompressed
      const json = atob(b64);
      return JSON.parse(json);
    } catch {
      return null;
    }
  }
}

/**
 * Copy scene URL to clipboard and show toast
 */
export async function copySceneURL(state: SceneData): Promise<void> {
  try {
    const url = await encodeSceneToURL(state);
    await navigator.clipboard.writeText(url);
    toast("Scene URL copied to clipboard", "success");
  } catch (err) {
    toast("Failed to copy scene URL", "error");
    console.error(err);
  }
}

/**
 * Compress string using native CompressionStream API
 */
async function compressString(str: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);

  // Check if CompressionStream is available
  if (typeof CompressionStream === "undefined") {
    return data.buffer;
  }

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(data);
      controller.close();
    },
  });

  const compressedStream = stream.pipeThrough(
    new CompressionStream("gzip"),
  );

  const reader = compressedStream.getReader();
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result.buffer;
}

/**
 * Decompress string using native DecompressionStream API
 */
async function decompressString(buffer: ArrayBuffer): Promise<string> {
  // Check if DecompressionStream is available
  if (typeof DecompressionStream === "undefined") {
    const decoder = new TextDecoder();
    return decoder.decode(buffer);
  }

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(buffer));
      controller.close();
    },
  });

  const decompressedStream = stream.pipeThrough(
    new DecompressionStream("gzip"),
  );

  const reader = decompressedStream.getReader();
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  const decoder = new TextDecoder();
  return decoder.decode(result);
}
