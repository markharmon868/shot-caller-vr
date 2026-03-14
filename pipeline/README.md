# Data Pipeline — Street View → World Model

Pipeline for fetching Street View imagery, optionally expanding it with Nano Banana 2.5, and preparing input for world model generation.

## Flow

```
Street View API  →  Raw Images  →  [Nano Banana Expansion]  →  Enhanced Images  →  World Model (Marble/Luma)  →  .spz  →  VR App
```

## Structure

| Path | Purpose |
|------|---------|
| `street-view/` | Fetch images from Google Street View API |
| `image-expansion/` | Expand/outpaint via Nano Banana 2 (Replicate) |
| `world-model/` | Images → Gaussian splat (Marble/Luma stub) |
| `data/raw/` | Raw Street View downloads (gitignored) |
| `data/expanded/` | Nano Banana–expanded images (gitignored) |
| `data/output/` | Final images for world model tools (gitignored) |
| `.env` (project root) | API keys — copy from `.env.example`, never commit |

## Prerequisites

- **Google Cloud** API key with Street View Static API and/or Street View Tiles API enabled
- **Nano Banana 2.5** access (Replicate, Vertex AI, or Google AI Studio)
- Node 20.19+

## Setup

1. Copy the env template: `cp .env.example .env`
2. Add your keys to `.env` (never commit `.env`)
3. Install deps: `npm install`

## Usage

```bash
# Fetch Street View images for a location
npx tsx pipeline/scripts/fetch-street-view.ts --lat 40.7128 --lng -74.0060

# Expand images with Nano Banana 2 (Replicate)
# --skip: copy raw to expanded without API call (when REPLICATE_API_TOKEN not set)
# --aspect 16:9|21:9|match_input_image: expansion aspect (default 16:9)
npx tsx pipeline/scripts/expand-images.ts [--skip] [--aspect 16:9]

# Prepare output for world model (copy expanded/raw → output/)
npx tsx pipeline/scripts/prepare-output.ts

# Run full pipeline: fetch → expand → output
npx tsx pipeline/scripts/run-pipeline.ts --lat 40.7128 --lng -74.0060

# Multi-heading fetch (4 cardinal directions by default)
npx tsx pipeline/scripts/fetch-street-view.ts --lat 40.7128 --lng -74.0060 --headings 0,90,180,270

# World model generation (stub — manual workflow until API integration)
npx tsx pipeline/scripts/generate-splat.ts
```

## Loading Your Splat in the App

After generating a .spz (via Marble, Luma, or other tools), place it in `public/splats/` and load it:

```
https://localhost:8082/?splat=./splats/your-generated.spz
```
