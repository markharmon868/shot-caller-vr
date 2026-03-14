# Data Pipeline — Street View → World Model

Pipeline for fetching Street View imagery, optionally expanding it with Nano Banana 2.5, and preparing input for world model generation.

## Flow

```
Google Street View API  →  Raw Images  →  [Nano Banana 2.5 Expansion]  →  Enhanced Images  →  World Model
```

## Structure

| Path | Purpose |
|------|---------|
| `street-view/` | Fetch images from Google Street View API (Static API or Tiles API) |
| `image-expansion/` | Expand/outpaint images via Nano Banana 2.5 for better world model input |
| `data/raw/` | Raw Street View downloads (gitignored) |
| `data/expanded/` | Nano Banana–expanded images (gitignored) |
| `data/output/` | Final images ready for world model tools (gitignored) |
| `config/` | API keys, settings (use `.env`, gitignored) |

## Prerequisites

- **Google Cloud** API key with Street View Static API and/or Street View Tiles API enabled
- **Nano Banana 2.5** access (Replicate, Vertex AI, or Google AI Studio)
- Node 20.19+

## Usage

*Scripts to be added.*

```bash
# Fetch Street View images for a location
# npm run pipeline:fetch -- --lat 40.7128 --lng -74.0060

# Expand images with Nano Banana 2.5
# npm run pipeline:expand

# Run full pipeline
# npm run pipeline:run
```
