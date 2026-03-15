# Shot Caller VR — Feature Roadmap

**Last updated:** March 15, 2026

---

## Current State (as of March 15, 2026)

**Editor (fully working):**
- Load Gaussian splats (.spz) or panorama images as scene background
- Place cameras, lights, cast marks, crew, equipment, props in the scene
- Transform gizmos (W/E/R) — move, rotate, scale all elements
- Assign shot numbers, shot types, setup groups (A/B/C/D) with color coding
- Shot badge sprites floating above cameras (visible in VR too)
- Shot Review mode — step through sequenced shots, dim non-active elements, orbit to active camera
- Vertical offset slider ("Adjust Height") to align splat floor — persists to VR
- Save/restore scene to localStorage

**Location Scout (fully working):**
- Google Maps + Street View picker as the app landing page
- Click map → Street View updates live
- "Generate Gaussian Splat" triggers the full pipeline
- Progress polling with status updates
- "Open in Editor →" appears when done

**Pipeline (fully working):**
- Street View fetch: 8 headings × 3 pitches = 24 images per location
- Marble Labs API: upload → generate → poll → download .spz + GLB collider
- Output: `public/splats/scene-{id}.spz` + metadata JSON

**VR (fully working):**
- Walk through the blocked scene in VR (PICO headset or IWER desktop emulator)
- Editor elements load with same meshes (cameras, actors, equipment visible in VR)
- Splat vertical offset synced from editor
- Infinite floor collider (no falling off edges)

---

## Feature 1 — Shot Sequencer with Keyframed Animation

**Status:** Planned — medium effort

### What It Does
Allow actors, cameras, and equipment to have different positions per shot. Click through shots and watch elements animate to their positions for that setup.

### Remaining Work

#### 1.1 Keyframe Data Model
- Add `keyframes: Record<shotNumber, { position, rotationY }>` to `ElementData`
- Serialize/deserialize in `SceneState`

#### 1.2 Keyframe Recording UI
- In Shot Review mode with a shot active: "Set Position for Shot N" button in the properties panel
- Small dot indicator on elements that have a keyframe for the current shot

#### 1.3 Click-Through Playback
- When stepping shots in Review mode, elements with keyframes for that shot animate to position over 0.5s (lerp)
- Elements without a keyframe hold their last known position

#### 1.4 Auto-Play (optional)
- "Play" button steps through shots on a 2s timer
- Useful for presenting the blocking plan

### Files
- `src/editor/elements/ProductionElement.ts` — keyframes map, `setKeyframe()`, `lerpToKeyframe()`
- `src/editor/EditorApp.ts` — lerp animation in review step, "Set Position" button
- `src/editor/SceneState.ts` — serialize keyframes

---

## Feature 2 — Location Scout Polish

**Status:** Partially done — small remaining gaps

### Done
- Map picker, Street View preview, pipeline trigger, progress polling, "Open in Editor"
- Coordinates locked until explicit map click (no accidental Hollywood submissions)

### Remaining Work

#### 2.1 Address Search
- Add a search box to the map (Google Places Autocomplete) so users can type an address instead of clicking the map manually

#### 2.2 No Street View Coverage Handling
- Some locations have no Street View data — show a clear error message with a suggestion to try nearby

#### 2.3 Recent Scenes Persistence
- Currently the Recent Scenes list is in-memory only (lost on server restart)
- Write job metadata to a `.data/pipeline-jobs.json` file so history survives restarts

#### 2.4 Scout → Editor Splat Continuity
- When "Open in Editor" is clicked, the editor should start fresh (clear previous elements) since it's a new location
- Currently it restores the last saved scene which may have elements from a different splat

### Files
- `src/scout/ScoutApp.ts` — Places Autocomplete, coverage error
- `server/pipeline/manager.ts` — persist job history to disk

---

## Feature 3 — Scout → Editor → VR Flow

**Status:** Partially done — routing works, polish remaining

### Done
- `/?` → Scout landing page
- `/?mode=editor` → Editor
- `/?mode=editor&splat=./splats/x.spz` → Editor with specific splat
- `/?mode=stage4-xr` → VR walkthrough
- "Preview in VR" button in editor
- "Open in Editor →" button in scout after generation

### Remaining Work

#### 3.1 Back Button in VR
- A "Back to Editor" action in VR that returns to `/?mode=editor` without losing the scene
- Could be a floating spatial UI button or triggered by a controller gesture

#### 3.2 Scene ID Threading
- The sceneId is currently hardcoded to `"demo"` for all scenes
- Multiple saved scenes aren't distinguishable — the second generated splat overwrites the first
- Each pipeline job should create its own sceneId and the editor should load elements specific to that scene

#### 3.3 New Scene Flow
- When opening a newly generated splat in the editor, start with a clean element slate
- Add a "New Scene" button in the editor that clears elements and prompts for a splat URL

---

## Feature 4 — Call Sheet / Shot List Export

**Status:** Planned — medium effort (see `docs/export.md` for full spec)

### What It Does
Generate a production-ready document from the blocked scene: shot list ordered by setup group, cast call times, crew list, equipment list with day-rate estimates, and a schedule — all AI-generated via Claude.

### Remaining Work

#### 4.1 Scene Data Assembly
- Collect all cameras (shot list), cast marks (call sheet), crew, equipment from `SceneState`
- Format as a structured prompt payload

#### 4.2 Claude API Integration
- POST scene JSON to Claude with a prompt requesting: shot descriptions, call times, equipment day rates, schedule blocks
- Stream the response or show a loading state

#### 4.3 Rendered Document
- Styled HTML overlay inside the editor — sections for Shot List, Cast, Crew, Equipment, Budget, Schedule
- Print stylesheet for PDF export via `window.print()`

#### 4.4 UI Entry Point
- "Generate Call Sheet" button in the editor toolbar (next to "Preview in VR")

### Files to Create
- `src/export/generateCallSheet.ts`
- `src/export/CallSheetRenderer.ts`
- Server endpoint for Claude call (keeps API key server-side)

---

## Priority Order

| # | Feature | Status | Effort | Value |
|---|---------|--------|--------|-------|
| 1 | Scene ID threading + new scene flow (Feature 3.2–3.3) | Remaining | Low | High |
| 2 | Address search on scout map (Feature 2.1) | Remaining | Low | High |
| 3 | Call Sheet Export (Feature 4) | Not started | Medium | High |
| 4 | Back button in VR (Feature 3.1) | Remaining | Low | Medium |
| 5 | Recent scenes persistence (Feature 2.3) | Remaining | Low | Medium |
| 6 | Shot Sequencer + Keyframes (Feature 1) | Not started | High | Medium |
