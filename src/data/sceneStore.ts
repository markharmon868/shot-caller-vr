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

export async function loadSceneBundle(sceneId: string): Promise<SceneBundle> {
  const [worldJson, sceneJson, assetJson] = await Promise.all([
    fetchJson(`/scenes/${sceneId}.world.json`),
    fetchJson(`/scenes/${sceneId}.scene.json`),
    fetchJson(`/scenes/${sceneId}.assets.json`),
  ]);

  const seedBundle = validateSceneBundle({
    world: validateWorldDescriptor(worldJson),
    scene: validateSceneDocument(sceneJson),
    assets: validateAssetCatalogDocument(assetJson),
  });
  const bundle = cloneBundle(seedBundle);

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
