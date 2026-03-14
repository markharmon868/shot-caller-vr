/**
 * Google Street View API — fetch panoramic images by location.
 *
 * Uses Street View Static API:
 * https://developers.google.com/maps/documentation/streetview/request-streetview
 *
 * Or Street View Tiles API for higher-res tiles:
 * https://developers.google.com/maps/documentation/tile/streetview
 */

export interface StreetViewFetchOptions {
  lat: number;
  lng: number;
  /** Heading 0–360. Default 0 (North). */
  heading?: number;
  /** Pitch -90–90. Default 0. */
  pitch?: number;
  /** Field of view 10–120. Default 90. */
  fov?: number;
  /** Image size, e.g. "640x640". */
  size?: string;
}

export interface StreetViewResult {
  imageBuffer: Buffer;
  metadata?: {
    lat: number;
    lng: number;
    panoId?: string;
    heading: number;
    pitch: number;
  };
}

/**
 * Fetch a Street View image for the given coordinates.
 * Requires GOOGLE_MAPS_API_KEY in env.
 */
export async function fetchStreetViewImage(
  options: StreetViewFetchOptions
): Promise<StreetViewResult> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_MAPS_API_KEY is required. Add to .env");
  }

  const params = new URLSearchParams({
    size: options.size ?? "640x640",
    location: `${options.lat},${options.lng}`,
    key: apiKey,
  });
  if (options.heading != null) params.set("heading", String(options.heading));
  if (options.pitch != null) params.set("pitch", String(options.pitch));
  if (options.fov != null) params.set("fov", String(options.fov));

  const url = `https://maps.googleapis.com/maps/api/streetview?${params}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Street View API error: ${res.status} ${res.statusText}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const imageBuffer = Buffer.from(arrayBuffer);

  return {
    imageBuffer,
    metadata: {
      lat: options.lat,
      lng: options.lng,
      heading: options.heading ?? 0,
      pitch: options.pitch ?? 0,
    },
  };
}
