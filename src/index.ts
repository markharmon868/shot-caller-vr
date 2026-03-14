// Shot Caller — entry point
// Routes to Web3D editor (desktop) or PICO VR walkthrough based on device.
export {};

/**
 * Detect a real VR headset browser by user agent.
 * IWER injects WebXR on desktop too, so XR support alone isn't enough.
 * PICO browser: "PicoXR" | Quest browser: "OculusBrowser" | generic WebXR: "WebXR"
 */
function isHeadsetBrowser(): boolean {
  const ua = navigator.userAgent;
  return /PicoXR|OculusBrowser|SamsungBrowser\/.*VR|Mobile VR|Quest/i.test(ua);
}

// URL param ?mode=vr forces VR world (useful for testing on desktop without headset)
// URL param ?mode=editor forces editor (useful if headset browser needs editor view)
const modeParam = new URLSearchParams(window.location.search).get("mode");

const useVR = modeParam === "vr" || (modeParam !== "editor" && isHeadsetBrowser());

if (useVR) {
  // Mode 2 — PICO VR Walkthrough
  const { startXRWorld } = await import("./xrWorld.js");
  startXRWorld();
} else {
  // Mode 1 — Web3D Planning Editor
  const { startEditor } = await import("./editor/EditorApp.js");
  startEditor();
}
