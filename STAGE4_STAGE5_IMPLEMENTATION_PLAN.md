# Stage 4 and Stage 5 XR Review + Export Plan

## Summary

Build Stage 4 and Stage 5 as a shared scene-consumption pipeline, not as an extension of the current single-scene demo. Stage 4 becomes the immersive validation flow on PICO using `immersive-vr`; Stage 5 becomes a locked immersive final-review flow plus the required browser viewer and PDF export outputs from the same saved scene state.

This repo will not implement Stage 3 authoring in this pass. It will consume Stage 2/3 outputs as inputs only: world splat/collider assets plus scene JSON. Because the repo is currently static/browser-only, implement in two slices: Slice 1 adds Stage 4 XR review, Stage 5 XR final review, Stage 5 browser viewer, local scene storage, and orthographic export capture; Slice 2 adds the PDF serverless export endpoint on the same schema.

## Key Changes

- Replace the current unconditional boot with a mode router driven by `?scene=<sceneId>&mode=stage4-xr|stage5-xr|viewer|export`.
- Use `immersive-vr` for Stage 4 and Stage 5 XR, with explicit user-triggered session start and no fallback XR modes.
- Add versioned scene/world/assets contracts and fail hard on schema mismatch.
- Load immutable fixture scene data from `public/scenes/` and persist only review issues, approval, and export state in `localStorage`.
- Keep XR review blocked when no collider is present; no fallback locomotion surface is added.
- Use DOM overlay UI for browser modes and a minimal spatial HUD in XR.
- Reuse the same world and helper rendering rules across viewer, XR, and top-down export capture.

## Test Plan

- Viewer and export modes render the same scene state from the same bundle.
- Stage 4 XR refuses to launch when the collider is missing.
- Stage 5 XR refuses to launch unless the scene is validated.
- Review issues persist locally and re-render on reload.
- Export capture persists locally and queues a payload contract for later PDF service work.
- Exiting XR returns cleanly to the browser shell without duplicating runtime objects.

## Assumptions

- Stage 5 remains `XR final review + browser viewer + PDF export`.
- Local-first persistence is the implementation target for Slice 1.
- PICO-class browsers with WebXR support are the primary immersive target.
- No backward-compatibility layer is preserved for the old SensAI demo beyond still-required dependency workarounds.
