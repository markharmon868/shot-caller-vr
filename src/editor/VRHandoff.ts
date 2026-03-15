/**
 * VRHandoff — Jobs principle: The magic moment
 * The VR Preview button should build anticipation, not just navigate
 */

import type { SceneState } from "./SceneState.js";
import { toast } from "./Toast.js";

export interface VRHandoffOptions {
  countdownDuration?: number;
  validateBeforeLaunch?: boolean;
}

const DEFAULT_OPTIONS: Required<VRHandoffOptions> = {
  countdownDuration: 3000,
  validateBeforeLaunch: true,
};

/**
 * Launch VR preview with dramatic transition
 */
export async function launchVRPreview(
  state: SceneState,
  options: VRHandoffOptions = {},
): Promise<void> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Step 1: Validate something exists to preview
  if (opts.validateBeforeLaunch) {
    const cameras = Array.from(state.elements.values()).filter(
      (e) => e.type === "camera",
    );
    if (cameras.length === 0) {
      toast("Add at least one camera to preview in VR", "error");
      return;
    }
  }

  // Step 2: Save scene with dramatic UI feedback
  try {
    state.saveLocal();
    toast("Scene saved", "success", 1000);
  } catch (error) {
    toast("Failed to save scene before VR handoff", "error");
    console.error("Save error:", error);
    return;
  }

  // Step 3: Build anticipation — brief countdown before navigating
  const btn = document.getElementById("btn-vr") as HTMLButtonElement | null;
  if (btn) {
    btn.disabled = true;
    await countdown(btn, opts.countdownDuration);
  }

  // Step 4: Full-screen transition before opening VR mode
  await showFullscreenTransition(() => {
    window.location.href = "/?mode=stage4-xr";
  });
}

/**
 * Countdown animation on button
 */
function countdown(btn: HTMLButtonElement, totalMs: number): Promise<void> {
  return new Promise((resolve) => {
    const originalText = btn.textContent;
    const steps = 3;
    const stepMs = totalMs / steps;
    let count = steps;

    const interval = setInterval(() => {
      btn.textContent = `▶ Launching in ${count}...`;
      count--;
      if (count < 0) {
        clearInterval(interval);
        btn.textContent = originalText;
        resolve();
      }
    }, stepMs);
  });
}

/**
 * Fullscreen fade transition
 */
function showFullscreenTransition(onComplete: () => void): Promise<void> {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: #000;
      opacity: 0;
      z-index: 99999;
      transition: opacity 0.6s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'IBM Plex Mono', monospace;
      color: #e8a020;
      font-size: 18px;
      letter-spacing: 0.2em;
    `;
    overlay.textContent = "ENTERING SCENE";
    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
      overlay.style.opacity = "1";
      setTimeout(() => {
        onComplete();
        resolve();
      }, 900);
    });
  });
}
