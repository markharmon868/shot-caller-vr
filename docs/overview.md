# Shot Caller VR — Overview

**Last updated:** March 14, 2026

---

## What It Is

Shot Caller VR is a generative worlds–powered pre-vis tool for filmmakers. It lets you explore and plan shots in VR, using Gaussian splat worldmodels for immersive set ideation and shot planning.

The project is based on the SensAI WebXR Worldmodels template, which combines WebXR, Gaussian splat rendering, and spatial UI into a single VR-ready app.

---

## Current State (March 14, 2026)

- **Stage:** Early/template. Core infrastructure is in place; filmmaker-specific workflows are not yet built.
- **Working:** Gaussian splat worldmodel loading and rendering, locomotion (teleport, smooth movement), grabbing, spatial UI, IWSDK headset simulator for desktop testing, Level-of-Detail (LoD) splat rendering for Quest/PICO.
- **Not yet implemented:** Generative world creation, shot planning UI, set idea generation, filmmaker-focused features.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Runtime** | WebXR (immersive VR in the browser) |
| **Framework** | IWSDK 0.2.2 (Immersive Web SDK) — ECS, locomotion, grabbing, spatial UI |
| **3D** | Three.js r181 (`super-three@0.181.0`) |
| **Splat rendering** | SparkJS 2.0 preview — Gaussian splats with LoD |
| **Build** | Vite 7, TypeScript 5.5 |
| **UI** | UIKitML (IWSDK spatial UI) |
| **Local dev** | vite-plugin-mkcert (HTTPS), IWER plugin (Quest simulator) |

**Other:** World Labs Marble–compatible `.spz` / `.ply` assets, optional `.gltf` / `.glb` collision meshes for locomotion.
