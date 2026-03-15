# Shot Caller

> Plan your shoot on a laptop. Walk it in VR. Let AI write the call sheet.

Shot Caller is a WebXR production planning tool for filmmakers. Input a real shooting location, generate a 3D world model of that space, block your cameras and lights in a 3D editor, sequence your shots, validate everything in VR on a PICO headset, and export an AI-generated call sheet your AD can actually use.

Built at the [World Model Hackathon](https://luma.com/worldsinaction-sf26) — SensAI × PICO, March 2026.

---

<!-- SCREENSHOT: Hero screenshot or GIF of the 3D editor with a scene blocked out -->
<!-- Suggested: Wide shot of the editor showing a camera with FOV cone, a light with coverage cone, and a cast mark on a Gaussian splat world -->

---

## What it does

Shot Caller has four modes accessible from a single URL:

| Mode | Surface | What happens |
|------|---------|--------------|
| **Scouting** | Desktop | Input a Google Maps address or upload scout photos → Marble API generates a 3D Gaussian splat of the real location |
| **Editing** | Desktop | Place cameras (with FOV cones), lights (with coverage cones), crew markers, and cast marks in the world. Sequence shots and group lighting setups. |
| **VR Preview** | PICO headset | Same URL detects WebXR → immersive walkthrough of the fully blocked scene at real scale |
| **Export** | Desktop | Claude AI agent reads the blocking plan → generates shooting order, equipment list, department breakdown → exports as PDF + shareable URL |

---

## Demo

<!-- SCREENSHOT: GIF or video embed of the full demo flow -->
<!-- Suggested flow: address input → loading screen → world loads → place camera → sequence → generate call sheet → hand to PICO -->

**Demo video:** [Insert YouTube/Loom link here]

**Live demo:** [Insert Vercel deployment URL here]

---

## Screenshots

<!-- Add screenshots below as you have them. Suggested captions included. -->

### Scouting Mode — Location input
<!-- SCREENSHOT: The location input panel with a Maps address field and photo upload option -->

### Editing Mode — 3D planning editor
<!-- SCREENSHOT: Three.js orbit viewport with a camera (FOV cone), light (coverage cone), and cast mark placed in a Gaussian splat world -->

### Shot Sequencing
<!-- SCREENSHOT: Sequence mode active — cameras numbered 1, 2, 3 with shot type labels visible -->

### AI Call Sheet Output
<!-- SCREENSHOT: The call sheet panel showing shooting order grouped by setup, equipment list, and department breakdown -->

### VR Preview — PICO walkthrough
<!-- SCREENSHOT: PICO headset view showing the Gaussian splat world with camera placement and FOV cone visible at real scale -->

### PDF Export
<!-- SCREENSHOT: The exported PDF showing the top-down floor plan alongside the AI-generated call sheet -->

---

## Tech stack

```
Frontend         Three.js r181 · IWSDK (ElixrJS) · SparkJS 2.0 · Vite · TypeScript
World model      World Labs Marble API (Gaussian splat generation)
Location data    Google Maps Static API · Google Street View Static API
XR               WebXR Device API · PICO 4 browser
AI agent         Claude API (claude-sonnet-4-6) via Anthropic SDK
Scene state      Vercel KV (Redis)
Export           PDFKit · Three.js orthographic renderer
Deployment       Vercel (static + serverless functions)
Base template    sensai-webxr-worldmodels (IWSDK + SparkJS + PICO emulator)
```

---

## Architecture

```
Browser (Desktop)                    Browser (PICO)
┌─────────────────────────┐          ┌──────────────────────────┐
│  Three.js Orbit Editor  │          │  IWSDK XR Session        │
│  - Camera + FOV cone    │          │  - SparkJS .spz render   │
│  - Light + coverage     │  same    │  - GLTF elements at      │
│  - Crew / cast markers  │  URL ──► │    real scale            │
│  - Shot sequencing      │          │  - Shot number badges    │
│  - Setup grouping       │          │  - Locomotion (PICO)     │
└────────────┬────────────┘          └──────────────────────────┘
             │ scene JSON
             ▼
┌─────────────────────────────────────────────────────────────┐
│                    Vercel Serverless                        │
│                                                             │
│  /api/generate-world   Maps imagery → Marble → .spz        │
│  /api/scene            POST/GET scene JSON (Vercel KV)      │
│  /api/callsheet        Scene JSON → Claude API → call sheet │
│  /api/export-pdf       Floor plan PNG + call sheet → PDF   │
└─────────────────────────────────────────────────────────────┘
             │                │                │
             ▼                ▼                ▼
      Marble API        Vercel KV        Claude API
   (world gen)        (scene state)   (call sheet gen)
```

---

## Getting started

### Prerequisites

- Node.js >= 20.19.0
- A WebXR-capable browser (Chrome recommended for desktop)
- PICO 4 headset for VR preview (optional — desktop emulator available)

### Environment variables

Copy `.env.example` to `.env.local` and fill in your keys:

```env
GOOGLE_MAPS_API_KEY=        # Google Cloud — Maps Static API + Street View Static API
MARBLE_API_KEY=             # World Labs — marble.worldlabs.ai
ANTHROPIC_API_KEY=          # Anthropic — console.anthropic.com
KV_REST_API_URL=            # Vercel KV — from Vercel dashboard
KV_REST_API_TOKEN=          # Vercel KV — from Vercel dashboard
```

### Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

**PICO testing:** Use `npm run dev -- --host` to expose on your local network, then open the IP address in the PICO browser. Or deploy to Vercel for HTTPS (required for WebXR on device).

### Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Add your environment variables in the Vercel dashboard under Project Settings → Environment Variables.

---

## Project structure

```
shot-caller-vr/
├── src/
│   ├── index.ts              # Entry point — mode detection + scene init
│   ├── editor/
│   │   ├── Editor.ts         # Three.js orbit scene, OrbitControls
│   │   ├── ElementManager.ts # Place, select, drag production elements
│   │   ├── SequenceMode.ts   # Shot numbering, type tagging, setup groups
│   │   └── elements/
│   │       ├── Camera.ts     # Camera GLTF + CameraHelper FOV cone
│   │       ├── Light.ts      # Light GLTF + SpotLight coverage cone
│   │       ├── CrewMark.ts   # Crew position silhouette + role label
│   │       └── CastMark.ts   # Floor X + character name + eyeline
│   ├── vr/
│   │   ├── VRScene.ts        # IWSDK XR session + SparkJS splat loader
│   │   ├── ElementRenderer.ts# Render scene JSON elements in XR
│   │   └── Locomotion.ts     # PICO controller teleport + smooth walk
│   ├── scene/
│   │   ├── SceneManager.ts   # Serialise / deserialise scene JSON
│   │   └── types.ts          # Scene JSON schema types
│   └── ui/
│       ├── Sidebar.ts        # Element picker + sequence mode controls
│       ├── CallSheetPanel.ts # Render AI call sheet output
│       └── ExportPanel.ts    # Export controls + shareable URL
├── api/
│   ├── generate-world.ts     # Maps + Marble API → .spz
│   ├── scene.ts              # Vercel KV scene CRUD
│   ├── callsheet.ts          # Claude API call sheet generation
│   └── export-pdf.ts         # PDFKit PDF generation
├── public/
│   └── assets/
│       └── models/           # Pre-built GLTF production elements
│           ├── camera.glb
│           ├── light-led.glb
│           ├── light-fresnel.glb
│           ├── crew-silhouette.glb
│           ├── dolly.glb
│           └── c-stand.glb
├── index.html
├── vite.config.ts
├── tsconfig.json
└── .env.example
```

---

## Scene JSON schema

The core data structure shared between the editor, VR mode, and AI agent:

```typescript
interface SceneJSON {
  id: string
  location: {
    address: string
    lat?: number
    lng?: number
  }
  splatUrl: string          // CDN URL of the .spz world file
  meshUrl: string           // CDN URL of the .glb collision mesh
  elements: ProductionElement[]
  createdAt: string
  updatedAt: string
}

interface ProductionElement {
  id: string
  type: 'camera' | 'light' | 'crew' | 'cast' | 'equipment' | 'setdressing'
  label: string
  position: { x: number; y: number; z: number }
  rotation: { x: number; y: number; z: number }

  // Camera-specific
  focalLength?: number
  shotNumber?: number       // Shot sequence order
  shotType?: 'Wide' | 'Medium' | 'CU' | 'OTS' | 'Insert' | 'POV'
  shotLabel?: string
  setupGroup?: 'A' | 'B' | 'C' | 'D'

  // Light-specific
  colourTemp?: number       // Kelvin
  lightType?: 'LED' | 'Fresnel' | 'Practical' | 'HMI'

  // Crew-specific
  role?: string             // e.g. "DP", "1st AC", "Gaffer"
  department?: string
}
```

---

## AI call sheet agent

The `/api/callsheet` endpoint sends the scene JSON to Claude with a structured prompt and returns:

```typescript
interface CallSheetJSON {
  shootingOrder: {
    setupGroup: string
    shots: { shotNumber: number; type: string; label: string; cameraId: string }[]
    lightingNotes: string
    estimatedMinutes: number
  }[]
  equipmentList: {
    item: string
    quantity: number
    department: string
  }[]
  departmentCalls: {
    department: string
    callTime: 'First' | 'After camera' | 'After lighting'
    notes: string
  }[]
  totalEstimatedMinutes: number
  productionNotes: string
}
```

The agent reasons about shooting order efficiency (grouping by setup group to minimise lighting turnaround), equipment quantities (derived from element counts and types), department dependencies (crane placed → grip department call), and setup time estimates.

---

## Team

<!-- Add team members and their roles -->

| Name | Role |
|------|------|
| [Your name] | [Your role — e.g. Web3D Editor + Shot Sequencing] |
| [Teammate 2] | [e.g. Location Pipeline + World Generation] |
| [Teammate 3] | [e.g. VR Mode + AI Agent + Export] |

---

## Acknowledgements

- [SensAI Hackademy](https://sensaihackademy.com/) and [PICO](https://www.picoxr.com/global) for organising the World Model Hackathon
- [World Labs](https://www.worldlabs.ai/) for the Marble API and the [sensai-webxr-worldmodels](https://github.com/V4C38/sensai-webxr-worldmodels) template
- [SparkJS](https://sparkjs.dev/) for the open-source Gaussian splat renderer
- [IWSDK / ElixrJS](https://elixrjs.io/) for the WebXR framework
- [Anthropic](https://anthropic.com) for the Claude API
- [Kenney.nl](https://kenney.nl) and [Mixamo](https://mixamo.com) for free GLTF assets

---

## License

MIT
