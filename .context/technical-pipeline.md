# Shot Caller — Technical Pipeline Notes

## Updated Pipeline (Post-Mentor Feedback)

### Stage 1: Location Input
- Google Maps address OR uploaded scout photos
- Google Maps Static API + Street View API for satellite/panoramic imagery

### Stage 2: 360 Generation (NEW — SVD 360)
- Instead of using NarrowBanana or image generation models
- Use **SVD 360** (https://svd360.com/) to generate 360-degree panoramic views
- This produces better input for World Labs Marble API
- Flow: Location photos → SVD 360 → 360 panorama

### Stage 3: World Generation
- 360 panorama → World Labs Marble API → .spz Gaussian splat
- Also generates collision mesh (.glb) for VR locomotion
- Output stored on CDN

### Stage 4: Web3D Planning Editor (Desktop)
- Three.js r181 + SparkJS 2.0 for splat rendering
- Placeable elements: cameras (FOV cones), 3-point lighting, actor positions, grid gear, craft services
- Scene JSON auto-saves to Vercel KV
- Meshy 6 API for custom 3D asset generation from text/image prompts

### Stage 5: PICO VR Walkthrough
- Same URL — auto-detects WebXR via navigator.xr.isSessionSupported()
- IWSDK (ElixrJS) for XR session management
- SparkJS 2.0 with LoD for frame rate stability
- Read-only walkthrough — validates the plan at real scale
- Semi-aerial overview mode for top-down perspective

### Stage 6: Export
- Shareable 3D URL (interactive orbit viewer)
- PDF production plan (top-down floor plan + element breakdown for AD)

## Tech Stack Summary
| Layer | Tool |
|-------|------|
| Location data | Google Maps Static + Street View API |
| 360 generation | SVD 360 (https://svd360.com/) |
| World generation | World Labs Marble API |
| Asset generation | Meshy 6 API |
| Splat rendering | SparkJS 2.0 |
| 3D engine | Three.js r181 |
| XR framework | IWSDK (ElixrJS) |
| Scene state | Vercel KV (Redis) |
| Export | PDFKit + Three.js ortho camera |
| Build | Vite + TypeScript |
| Deploy | Vercel |

## Demo Location
San Francisco — Golden Gate Bridge area
