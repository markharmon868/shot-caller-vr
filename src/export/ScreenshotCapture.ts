/**
 * ScreenshotCapture — Capture frames from the 3D scene for report generation
 * Renders the scene from different camera perspectives and exports as images
 */

import * as THREE from "three";

export interface CaptureOptions {
  width?: number;
  height?: number;
  format?: "image/png" | "image/jpeg";
  quality?: number;
}

export interface CameraShot {
  camera: THREE.Camera;
  name: string;
  description?: string;
}

const DEFAULT_OPTIONS: Required<CaptureOptions> = {
  width: 1920,
  height: 1080,
  format: "image/png",
  quality: 0.95,
};

/**
 * Capture a screenshot from a specific camera viewpoint
 */
export async function captureScreenshot(
  scene: THREE.Scene,
  camera: THREE.Camera,
  options: CaptureOptions = {},
): Promise<string> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Create an offscreen renderer
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    preserveDrawingBuffer: true,
    alpha: false,
  });

  renderer.setSize(opts.width, opts.height);
  renderer.setPixelRatio(2); // High quality for prints

  // Render the scene
  renderer.render(scene, camera);

  // Capture as data URL
  const dataUrl = renderer.domElement.toDataURL(opts.format, opts.quality);

  // Clean up
  renderer.dispose();

  return dataUrl;
}

/**
 * Capture multiple screenshots from different camera angles
 */
export async function captureMultipleShots(
  scene: THREE.Scene,
  shots: CameraShot[],
  options: CaptureOptions = {},
  onProgress?: (current: number, total: number) => void,
): Promise<Map<string, string>> {
  const screenshots = new Map<string, string>();

  for (let i = 0; i < shots.length; i++) {
    const shot = shots[i];

    if (onProgress) {
      onProgress(i + 1, shots.length);
    }

    const dataUrl = await captureScreenshot(scene, shot.camera, options);
    screenshots.set(shot.name, dataUrl);

    // Small delay to prevent blocking
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return screenshots;
}

/**
 * Capture a bird's-eye view of the entire scene
 */
export async function captureBirdsEye(
  scene: THREE.Scene,
  bounds: { min: THREE.Vector3; max: THREE.Vector3 },
  options: CaptureOptions = {},
): Promise<string> {
  // Calculate scene center and size
  const center = new THREE.Vector3()
    .addVectors(bounds.min, bounds.max)
    .multiplyScalar(0.5);

  const size = new THREE.Vector3().subVectors(bounds.max, bounds.min);
  const maxDim = Math.max(size.x, size.z);

  // Create orthographic camera looking down
  const camera = new THREE.OrthographicCamera(
    -maxDim / 2,
    maxDim / 2,
    maxDim / 2,
    -maxDim / 2,
    0.1,
    1000,
  );

  camera.position.set(center.x, bounds.max.y + 10, center.z);
  camera.lookAt(center);
  camera.up.set(0, 0, -1); // Z-axis pointing up in top-down view

  return captureScreenshot(scene, camera, options);
}

/**
 * Capture a thumbnail version of a screenshot
 */
export async function captureThumbnail(
  scene: THREE.Scene,
  camera: THREE.Camera,
): Promise<string> {
  return captureScreenshot(scene, camera, {
    width: 320,
    height: 180,
    format: "image/jpeg",
    quality: 0.8,
  });
}
