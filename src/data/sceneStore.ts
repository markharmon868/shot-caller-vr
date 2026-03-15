import {
  type ApprovalState,
  type ExportState,
  type ReviewIssue,
  type SceneBundle,
  validateAssetCatalogDocument,
  validateSceneBundle,
  validateSceneDocument,
  validateWorldDescriptor,
} from "../contracts/stageReview.js";

const STORAGE_PREFIX = "shot-caller";

function storageKey(kind: string, sceneId: string): string {
  return `${STORAGE_PREFIX}:${kind}:${sceneId}`;
}

function cloneBundle(bundle: SceneBundle): SceneBundle {
  return JSON.parse(JSON.stringify(bundle)) as SceneBundle;
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load fixture "${path}" (${response.status})`);
  }
  return (await response.json()) as T;
}

function readPersistedJson<T>(kind: string, sceneId: string): T | null {
  const raw = globalThis.localStorage.getItem(storageKey(kind, sceneId));
  if (!raw) {
    return null;
  }
  return JSON.parse(raw) as T;
}

function writePersistedJson(kind: string, sceneId: string, value: unknown): void {
  globalThis.localStorage.setItem(storageKey(kind, sceneId), JSON.stringify(value));
}

/** Clear any stale demo review state so old pre-placed elements don't bleed through */
function clearStaleReviewState(sceneId: string): void {
  for (const kind of ["reviewIssues", "approval", "exportState"]) {
    globalThis.localStorage.removeItem(storageKey(kind, sceneId));
  }
}

export async function loadSceneBundle(sceneId: string): Promise<SceneBundle> {
  const [worldJson, sceneJson, assetJson] = await Promise.all([
    fetchJson(`/scenes/${sceneId}.world.json`),
    fetchJson(`/scenes/${sceneId}.scene.json`),
    fetchJson(`/scenes/${sceneId}.assets.json`),
  ]);

  // If this is the first load of this world version, clear stale review state
  const versionKey = storageKey("seenWorldVersion", sceneId);
  const seenVersion = globalThis.localStorage.getItem(versionKey);
  const worldVersion = String((worldJson as Record<string, unknown>).version ?? 1);
  if (seenVersion !== worldVersion) {
    clearStaleReviewState(sceneId);
    globalThis.localStorage.setItem(versionKey, worldVersion);
  }

  const seedBundle = validateSceneBundle({
    world: validateWorldDescriptor(worldJson),
    scene: validateSceneDocument(sceneJson),
    assets: validateAssetCatalogDocument(assetJson),
  });
  const bundle = cloneBundle(seedBundle);

  // Override splat URL from the editor's last saved scene
  const editorScene = globalThis.localStorage.getItem(`shot-caller-scene-${sceneId}`);
  if (editorScene) {
    try {
      const saved = JSON.parse(editorScene) as { splatUrl?: string };
      if (saved.splatUrl) bundle.world.splatUrl = saved.splatUrl;
    } catch { /* ignore */ }
  }

  // Override elements with whatever the editor last saved
  const editorElements = globalThis.localStorage.getItem(`shot-caller:elements:${sceneId}`);
  if (editorElements) {
    try {
      bundle.scene.elements = JSON.parse(editorElements);
    } catch {
      // ignore malformed editor data, keep static elements
    }
  }

  const reviewIssues = readPersistedJson<ReviewIssue[]>("reviewIssues", sceneId);
  if (reviewIssues) {
    bundle.scene.reviewIssues = reviewIssues;
  }

  const approval = readPersistedJson<ApprovalState>("approval", sceneId);
  if (approval) {
    bundle.scene.approval = approval;
  }

  const exportState = readPersistedJson<ExportState>("exportState", sceneId);
  if (exportState) {
    bundle.scene.exportState = exportState;
  }

  return validateSceneBundle(bundle);
}

export function saveReviewIssues(sceneId: string, issues: ReviewIssue[]): void {
  issues.forEach((issue, index) => {
    if (!issue.id) {
      throw new Error(`Review issue ${index} is missing an id`);
    }
  });
  writePersistedJson("reviewIssues", sceneId, issues);
}

export function saveApproval(sceneId: string, approval: ApprovalState): void {
  writePersistedJson("approval", sceneId, approval);
}

export function saveExportState(sceneId: string, exportState: ExportState): void {
  writePersistedJson("exportState", sceneId, exportState);
}
