## Inspiration

Every film production starts with location scouting — driving to remote spots, taking reference photos, and trying to communicate a spatial vision through flat images and shot lists. Directors sketch blocking diagrams on paper. DPs squint at phone photos to plan lighting. ADs build call sheets in spreadsheets with no spatial context. The disconnect between 2D planning tools and 3D shooting reality costs productions time, money, and creative energy.

We asked: **what if a filmmaker could type an address, walk into a photorealistic 3D replica of that location, block their entire scene with cameras, lights, and crew — and have AI generate the call sheet?**

The World Model Hackathon gave us the perfect opportunity. With World Labs' Marble API generating Gaussian splats from Street View imagery and PICO headsets for immersive walkthroughs, we could finally bridge the gap between pre-production planning and on-set execution.

## What it does

Shot Caller turns any real-world location into a walkable 3D production planning environment. The entire workflow runs from a single URL:

1. **Scout** — Search any address on Google Maps. We fetch 24 Street View images (8 angles × 3 pitches) and send them to World Labs' Marble API, which generates a photorealistic Gaussian splat of the location.

2. **Block** — Open the 3D editor and place production elements in the splat world: cameras with FOV cones, lights with coverage cones and color temperature, cast marks with eyeline indicators, crew positions by department, and equipment from a production catalog (dollies, c-stands, cranes). Group elements into setups (A/B/C/D) and sequence your shots.

3. **Walk** — Open the same URL on a PICO headset. WebXR auto-detects and launches an immersive walkthrough at real-world scale. Walk through your blocked scene, check sightlines, validate camera positions — all before the crew shows up.

4. **Export** — Claude AI reads your entire blocking plan and reasons about shooting order efficiency, equipment quantities, department dependencies, and setup time estimates. It generates a professional call sheet with shooting order, equipment list, and department call times — exported as a PDF.

## How we built it

- **Frontend**: Three.js r181 for the 3D editor with custom production element classes (cameras, lights, crew, cast, equipment). SparkJS 2.0 for real-time Gaussian splat rendering. IWSDK (ElixrJS) for WebXR/PICO integration.
- **World Generation Pipeline**: Google Maps Static API + Street View Static API fetch 24 images per location. These feed into World Labs' Marble API, which generates .spz Gaussian splat files with collision meshes and metric scale factors.
- **Backend**: Express 5 + TypeScript server managing the pipeline jobs, scene state (Vercel KV), and API routing. Zod for schema validation across all boundaries.
- **AI Integration**: Claude API (claude-sonnet-4-6) powers the call sheet planner agent — it analyzes placed elements, reasons about setup grouping to minimize lighting turnaround, estimates quantities from the asset catalog, and generates structured call sheet JSON. Mastra Framework handles multi-turn AI workflows for the intake conversation.
- **VR**: WebXR Device API with PICO controller locomotion (teleport + smooth walk). Same scene data renders at real-world scale with ambient lighting optimized for splat visibility.

## Challenges we ran into

- **Gaussian splat rendering in WebXR**: Getting SparkJS splats to render correctly inside an IWSDK XR session required careful coordination of render loops and camera matrices. The splat renderer and Three.js scene needed to share the same WebGL context without z-fighting.
- **Street View coverage gaps**: Not every location has Street View imagery. We had to build validation that warns users before they trigger an expensive Marble API call, and handle partial coverage gracefully.
- **Real-world scale in VR**: The Marble API returns metric scale factors, but translating editor positions (meters) to feel correct when you're physically walking through them in VR required calibration and testing on actual PICO hardware.
- **AI call sheet reasoning**: Getting Claude to generate *useful* call sheets (not just formatted data) required iterative prompt engineering. The agent needs to reason about production logistics — why setup B should come after setup A (shared lighting rig), why grip should arrive before camera (crane setup time), etc.

## Accomplishments that we're proud of

- **End-to-end pipeline**: Type a real address → get a walkable 3D world → block your scene → get an AI call sheet. The entire workflow works from a single URL.
- **Single URL, multiple surfaces**: The same deployment serves the desktop editor and the VR walkthrough. User-agent detection seamlessly routes PICO headsets to immersive mode.
- **Production-grade element system**: Cameras with accurate FOV cones, lights with color temperature and coverage visualization, setup grouping, shot sequencing — these aren't toy demos, they're tools a real DP would recognize.
- **AI that reasons about production**: The Claude-powered call sheet doesn't just format data. It analyzes setup dependencies, minimizes lighting turnaround, and generates notes about department coordination.

## What we learned

- **World models are production-ready**: Marble API's Gaussian splats are good enough for spatial planning. The collision meshes enable real locomotion in VR. This isn't a gimmick — it's a practical workflow improvement.
- **WebXR is more capable than we expected**: PICO's browser handles Three.js + SparkJS splat rendering surprisingly well. The WebXR Device API is mature enough for production tools, not just demos.
- **AI agents need domain context**: Generic LLM calls produce generic output. When we gave Claude a structured scene with typed elements, catalog-matched equipment, and setup groupings, the call sheet output became genuinely useful for production planning.
- **Hackathon speed + production quality aren't mutually exclusive**: TypeScript strict mode, Zod validation, and clean architecture patterns let us move fast without accumulating the kind of tech debt that causes demo-day crashes.

## What's next for Shot Caller

- **Voice-to-scene**: Use speech-to-text so directors can describe their vision verbally and have AI place elements automatically
- **Multi-user collaboration**: Real-time shared sessions so the director, DP, and AD can block together from different locations
- **Generative 3D assets**: Integrate Meshy API for text-to-3D generation of custom props and set pieces
- **SVD 360 panoramas**: Generate 360° panoramic views from any angle for locations without Street View coverage
- **VR hand tracking**: Gesture-based element placement and manipulation directly in the headset
- **Real-time lighting simulation**: Physically-based lighting preview that matches placed light types and color temperatures
- **Equipment rental integration**: Live pricing from rental houses based on the AI-generated equipment list
