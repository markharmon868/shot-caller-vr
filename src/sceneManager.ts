/**
 * Scene Manager — Central scene selection and persistence
 * Ensures selected scene flows through Scout → Editor → VR pipeline
 */

export interface SceneInfo {
  id: string;
  name: string;
  splatUrl?: string;
}

const STORAGE_KEY = "shot-caller:active-scene";
const SCENES_STORAGE_KEY = "shot-caller:available-scenes";

/**
 * Get all available scenes (built-in + generated from Scout)
 */
export function getAvailableScenes(): SceneInfo[] {
  // Built-in scenes
  const builtIn: SceneInfo[] = [
    { id: "demo", name: "Sensai Demo" },
    { id: "golden-gate", name: "Golden Gate" },
    { id: "hollywood", name: "Hollywood" },
    { id: "scene-711be87d", name: "Scene 711be87d" },
  ];

  // Get dynamically generated scenes from localStorage
  const stored = localStorage.getItem(SCENES_STORAGE_KEY);
  const generated: SceneInfo[] = stored ? JSON.parse(stored) : [];

  return [...builtIn, ...generated];
}

/**
 * Register a new scene (typically from Scout generation)
 */
export function registerScene(sceneId: string, splatUrl?: string): void {
  const scenes = getAvailableScenes();
  const exists = scenes.find((s) => s.id === sceneId);

  if (!exists) {
    const generated = getGeneratedScenes();
    generated.push({
      id: sceneId,
      name: sceneId,
      splatUrl,
    });
    localStorage.setItem(SCENES_STORAGE_KEY, JSON.stringify(generated));
  }
}

function getGeneratedScenes(): SceneInfo[] {
  const stored = localStorage.getItem(SCENES_STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

/**
 * Get the currently active scene ID
 */
export function getActiveScene(): string {
  // Priority: URL param → localStorage → default
  const url = new URL(window.location.href);
  const urlScene = url.searchParams.get("scene");

  if (urlScene) {
    // Store URL scene as active for persistence
    setActiveScene(urlScene);
    return urlScene;
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  return stored || "demo";
}

/**
 * Set the active scene (stores in localStorage and updates URL)
 */
export function setActiveScene(sceneId: string): void {
  localStorage.setItem(STORAGE_KEY, sceneId);
  updateUrlScene(sceneId);
}

/**
 * Update URL scene parameter without reloading
 */
function updateUrlScene(sceneId: string): void {
  const url = new URL(window.location.href);
  url.searchParams.set("scene", sceneId);
  window.history.replaceState({}, "", url.toString());
}

/**
 * Navigate to a mode with the current active scene
 */
export function navigateToMode(mode: "editor" | "vr", sceneId?: string): void {
  const scene = sceneId || getActiveScene();
  const url = new URL(window.location.href);
  url.searchParams.set("mode", mode);
  url.searchParams.set("scene", scene);
  window.location.href = url.toString();
}

/**
 * Clear generated scenes (for testing/debugging)
 */
export function clearGeneratedScenes(): void {
  localStorage.removeItem(SCENES_STORAGE_KEY);
}
