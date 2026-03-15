/**
 * Google Street View Static API — fetch multi-angle panoramic images.
 *
 * Captures 8 headings × 3 pitches = 24 images per location for
 * good 3D reconstruction coverage.
 *
 * API docs: https://developers.google.com/maps/documentation/streetview/request-streetview
 * Enable "Street View Static API" in Google Cloud Console.
 */

export interface StreetViewLocation {
  lat: number;
  lng: number;
}

export interface StreetViewFetchOptions extends StreetViewLocation {
  /** Image size in pixels. Max 640 on free tier, 1280 with signing. Default "640x640". */
  size?: string;
  /** Headings to capture (0–360). Default: 8 directions every 45°. */
  headings?: number[];
  /** Pitches to capture (-90 to 90). Default: [-30, 0, 30]. */
  pitches?: number[];
  /** Field of view per image (10–120). Default 90. */
  fov?: number;
}

export interface StreetViewImage {
  buffer: Buffer;
  heading: number;
  pitch: number;
  lat: number;
  lng: number;
  panoId?: string;
}

export interface StreetViewFetchResult {
  images: StreetViewImage[];
  location: StreetViewLocation;
  panoId?: string;
}

/** 8 directions every 45° for full 360° horizontal coverage. */
const DEFAULT_HEADINGS = [0, 45, 90, 135, 180, 225, 270, 315];

/** Low / level / high pitches for vertical coverage. */
const DEFAULT_PITCHES = [-30, 0, 30];

/**
 * Fetch multi-angle Street View images for a location.
 * Returns headings.length × pitches.length images (default 24).
 */
export async function fetchStreetViewImages(
  options: StreetViewFetchOptions
): Promise<StreetViewFetchResult> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_MAPS_API_KEY not set. Add it to .env");
  }

  const headings = options.headings ?? DEFAULT_HEADINGS;
  const pitches = options.pitches ?? DEFAULT_PITCHES;
  const size = options.size ?? "640x640";
  const fov = options.fov ?? 90;
  const { lat, lng } = options;

  // Check metadata first — confirms pano exists and gets the canonical pano_id
  const metaUrl = new URL("https://maps.googleapis.com/maps/api/streetview/metadata");
  metaUrl.searchParams.set("location", `${lat},${lng}`);
  metaUrl.searchParams.set("key", apiKey);

  const metaRes = await fetch(metaUrl.toString());
  const meta = await metaRes.json() as {
    status: string;
    pano_id?: string;
    location?: { lat: number; lng: number };
  };

  if (meta.status !== "OK") {
    throw new Error(`No Street View coverage at ${lat},${lng}. Status: ${meta.status}`);
  }

  const panoId = meta.pano_id;
  const actualLat = meta.location?.lat ?? lat;
  const actualLng = meta.location?.lng ?? lng;

  console.log(`  Panorama: ${panoId} at ${actualLat.toFixed(6)},${actualLng.toFixed(6)}`);
  console.log(`  Fetching ${headings.length}×${pitches.length} = ${headings.length * pitches.length} images...`);

  const images: StreetViewImage[] = [];
  let fetched = 0;

  for (const heading of headings) {
    for (const pitch of pitches) {
      const url = new URL("https://maps.googleapis.com/maps/api/streetview");
      url.searchParams.set("size", size);
      // Use pano_id — more stable than lat/lng, avoids drift across calls
      if (panoId) {
        url.searchParams.set("pano", panoId);
      } else {
        url.searchParams.set("location", `${lat},${lng}`);
      }
      url.searchParams.set("heading", String(heading));
      url.searchParams.set("pitch", String(pitch));
      url.searchParams.set("fov", String(fov));
      url.searchParams.set("key", apiKey);

      const res = await fetch(url.toString());
      if (!res.ok) {
        console.warn(`\n    [WARN] heading ${heading}° pitch ${pitch}° → HTTP ${res.status}, skipping`);
        continue;
      }

      const buffer = Buffer.from(await res.arrayBuffer());
      images.push({ buffer, heading, pitch, lat: actualLat, lng: actualLng, panoId });
      fetched++;
      process.stdout.write(`\r  ${fetched}/${headings.length * pitches.length} downloaded`);
    }
  }
  process.stdout.write("\n");

  return { images, location: { lat: actualLat, lng: actualLng }, panoId };
}
