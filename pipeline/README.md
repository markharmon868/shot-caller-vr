# Data Pipeline — Street View → Marble Labs → .spz

Fetches multi-angle Street View imagery for a real-world location and submits it to Marble Labs to generate a Gaussian splat (.spz) for use in the Shot Caller editor.

## Flow

```
Google Street View API  →  24 images (8 headings × 3 pitches)  →  Marble Labs API  →  .spz  →  Editor
```

## Structure

| Path | Purpose |
|------|---------|
| `street-view/index.ts` | Fetch multi-angle images from Google Street View Static API |
| `world-model/marble.ts` | Marble Labs API client — submit images, poll, download .spz |
| `scripts/fetch-street-view.ts` | CLI: fetch images for a lat/lng |
| `scripts/generate-splat.ts` | CLI: submit to Marble Labs, download .spz |
| `scripts/run-pipeline.ts` | CLI: full pipeline end-to-end |
| `data/raw/` | Street View images (gitignored) |
| `.env` (project root) | API keys — copy from `.env.example`, never commit |

## API Keys Required

| Key | Where to get it |
|-----|----------------|
| `GOOGLE_MAPS_API_KEY` | Google Cloud Console — enable "Street View Static API" |
| `MARBLE_LABS_API_KEY` | Your Marble Labs account |

## Setup

```bash
cp .env.example .env
# Add GOOGLE_MAPS_API_KEY and MARBLE_LABS_API_KEY to .env
```

## Usage

```bash
# Full pipeline: fetch Street View → submit to Marble → download .spz
npm run pipeline:run -- --lat 34.0522 --lng -118.2437

# Custom output path
npm run pipeline:run -- --lat 34.0522 --lng -118.2437 --out public/splats/hollywood.spz

# Or run steps individually:
npx tsx pipeline/scripts/fetch-street-view.ts --lat 34.0522 --lng -118.2437
npx tsx pipeline/scripts/generate-splat.ts
```

## Image Coverage

The Street View fetcher captures 24 images per location by default:
- **8 headings**: 0°, 45°, 90°, 135°, 180°, 225°, 270°, 315°
- **3 pitches**: -30° (down), 0° (level), +30° (up)
- **Size**: 640×640 per image (free tier max)

More coverage = better 3D reconstruction. To get higher resolution images (1280×1280), you need a Google Maps API key with URL signing enabled.

## Loading Your Splat in the Editor

Place your `.spz` in `public/splats/` and load it:

```
https://localhost:8082/?splat=./splats/your-scene.spz
```

## ⚠️ API Endpoint Note

`pipeline/world-model/marble.ts` contains scaffolded Marble Labs endpoints based on standard REST conventions. Confirm the exact paths and response shapes with your Marble Labs API docs before running `generate-splat.ts`.
