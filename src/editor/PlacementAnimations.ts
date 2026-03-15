/**
 * PlacementAnimations — Atkinson principle: Moments of joy
 * Elements should feel physical when placed
 */

import * as THREE from "three";

export interface AnimationOptions {
  dropHeight?: number;
  duration?: number;
  bounceIntensity?: number;
}

const DEFAULT_OPTIONS: Required<AnimationOptions> = {
  dropHeight: 1.2,
  duration: 400,
  bounceIntensity: 0.08,
};

/**
 * Animates an element placement with a drop and bounce effect
 */
export function animatePlacement(
  mesh: THREE.Object3D,
  finalPosition: THREE.Vector3,
  options: AnimationOptions = {},
): Promise<void> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return new Promise((resolve) => {
    // Start slightly above, drop to position with ease
    const startY = finalPosition.y + opts.dropHeight;
    mesh.position.set(finalPosition.x, startY, finalPosition.z);
    mesh.scale.set(0, 0, 0);

    const start = performance.now();

    function tick(now: number): void {
      const t = Math.min((now - start) / opts.duration, 1);
      const ease = 1 - Math.pow(1 - t, 3); // cubic ease out

      mesh.position.y = startY + (finalPosition.y - startY) * ease;
      mesh.scale.setScalar(ease);

      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        mesh.position.copy(finalPosition);
        mesh.scale.setScalar(1);
        // Subtle bounce at the end
        animateBounce(mesh, opts.bounceIntensity).then(resolve);
      }
    }

    requestAnimationFrame(tick);
  });
}

/**
 * Bounce animation after placement
 */
function animateBounce(mesh: THREE.Object3D, intensity: number): Promise<void> {
  return new Promise((resolve) => {
    const bounces = [intensity, -intensity / 2, intensity / 4, 0];
    let i = 0;
    const interval = setInterval(() => {
      mesh.position.y += bounces[i++];
      if (i >= bounces.length) {
        clearInterval(interval);
        resolve();
      }
    }, 60);
  });
}

/**
 * Pulse animation for drawing attention
 */
export function animatePulse(
  element: HTMLElement,
  duration = 800,
  count = 3,
): Promise<void> {
  return new Promise((resolve) => {
    element.style.animation = `pulse ${duration}ms ease-in-out ${count}`;
    setTimeout(() => {
      element.style.animation = "";
      resolve();
    }, duration * count);
  });
}

/**
 * Create a temporary number popup (for shot assignment)
 */
export function createNumberPopup(
  number: number,
  position3D: THREE.Vector3,
  camera: THREE.Camera,
  renderer: THREE.WebGLRenderer,
): void {
  const pos = projectToScreen(position3D, camera, renderer);

  const el = document.createElement("div");
  el.className = "shot-number-pop";
  el.textContent = String(number).padStart(2, "0");
  el.style.cssText = `
    position: fixed;
    left: ${pos.x}px;
    top: ${pos.y}px;
    transform: translate(-50%, -50%) scale(0);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 28px;
    font-weight: bold;
    color: #e8a020;
    pointer-events: none;
    z-index: 9999;
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s;
  `;
  document.body.appendChild(el);

  requestAnimationFrame(() => {
    el.style.transform = "translate(-50%, -50%) scale(1)";
    el.style.opacity = "1";
    setTimeout(() => {
      el.style.transform = "translate(-50%, -70%) scale(0.8)";
      el.style.opacity = "0";
      setTimeout(() => el.remove(), 300);
    }, 900);
  });
}

/**
 * Project 3D position to screen coordinates
 */
function projectToScreen(
  position: THREE.Vector3,
  camera: THREE.Camera,
  renderer: THREE.WebGLRenderer,
): { x: number; y: number } {
  const vector = position.clone();
  vector.project(camera);

  const canvas = renderer.domElement;
  const rect = canvas.getBoundingClientRect();

  return {
    x: (vector.x * 0.5 + 0.5) * rect.width + rect.left,
    y: (-(vector.y * 0.5) + 0.5) * rect.height + rect.top,
  };
}
