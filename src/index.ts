import "./app.css";

import type { StageReviewMode } from "./contracts/stageReview.js";
import { resolveAppMode, type AppMode } from "./routing.js";
import {
  renderEditorShell,
  renderHeadsetEmptyShell,
  renderIntakeShell,
  renderReviewShell,
} from "./shells.js";

async function start(): Promise<void> {
  const url = new URL(window.location.href);
  const mode = resolveAppMode(url, navigator.userAgent);

  if (mode === "headset-empty") {
    renderHeadsetEmptyShell();
    return;
  ReviewIssue,
  SceneBundle,
  SceneStatus,
  StageReviewMode,
} from "./contracts/stageReview.js";
import {
  loadSceneBundle,
  saveApproval,
  saveExportState,
  saveReviewIssues,
} from "./data/sceneStore.js";
import { createBrowserShell } from "./browserShell.js";
import { getLatestOpenIssue, reviewBridge } from "./reviewBridge.js";
import { ViewerApp } from "./viewerApp.js";
import { XrReviewApp } from "./xrReviewApp.js";

type RuntimeApp = ViewerApp | XrReviewApp;
type XrNavigator = Navigator & {
  xr?: {
    isSessionSupported(mode: "immersive-vr"): Promise<boolean>;
  };
};

function parseMode(value: string | null): StageReviewMode | "editor" {
  switch (value) {
    case "stage4-xr":
      return value;
    case "editor":
    default:
      return "editor";
  }
}

async function checkXrSupport(mode: StageReviewMode | "editor"): Promise<boolean> {
  if (mode !== "stage4-xr" && mode !== "stage5-xr") {
    return false;
  }
  const xrNavigator = navigator as XrNavigator;
  if (!xrNavigator.xr) {
    return false;
  }
  return xrNavigator.xr.isSessionSupported("immersive-vr");
}

function deriveSceneStatus(bundle: SceneBundle): SceneStatus {
  if (bundle.scene.approval.status === "approved") {
    return "approved";
  }
  if (bundle.scene.status === "validated") {
    return "validated";
  }
  const hasResolvedIssue = bundle.scene.reviewIssues.some(
    (issue) => issue.status === "resolved",
  );
  const hasOpenIssue = bundle.scene.reviewIssues.some(
    (issue) => issue.status === "open",
  );
  if (hasResolvedIssue && !hasOpenIssue) {
    return "validated";
  }
  return bundle.scene.status;
}

function syncBridge(bundle: SceneBundle, mode: StageReviewMode, error: string | null = null): void {
  reviewBridge.setState({
    sceneId: bundle.scene.sceneId,
    mode,
    sceneStatus: deriveSceneStatus(bundle),
    approvalStatus: bundle.scene.approval.status,
    issueCount: bundle.scene.reviewIssues.filter((issue) => issue.status === "open")
      .length,
    error,
  });
}

function syncRuntimeIssues(runtime: RuntimeApp, bundle: SceneBundle): void {
  if (runtime instanceof XrReviewApp) {
    runtime.syncIssues();
  } else if (runtime instanceof ViewerApp) {
    runtime.updateIssues();
  }

  if (mode === "intake") {
    renderIntakeShell();
    const { startIntake } = await import("./intake/IntakeApp.js");
    await startIntake();
    return;
  }

  if (mode === "editor") {
    renderEditorShell();
    const { startEditor } = await import("./editor/EditorApp.js");
    startEditor();
    return;
async function bootstrapEditor(): Promise<void> {
  const { startEditor } = await import("./editor/EditorApp.js");
  startEditor();
}

async function bootstrapReview(): Promise<void> {
  const sceneContainer = document.getElementById("scene-container") as HTMLDivElement | null;
  const shellRoot = document.getElementById("shell-root") as HTMLDivElement | null;
  if (!sceneContainer || !shellRoot) {
    throw new Error("Missing root containers.");
  }

  const url = new URL(window.location.href);
  const sceneId = url.searchParams.get("scene") ?? "demo";
  const mode = "stage4-xr" as StageReviewMode;
  const shell = createBrowserShell(shellRoot);

  reviewBridge.setState({
    sceneId,
    mode,
    selectedLabel: null,
    error: null,
  });

  const bundle = await loadSceneBundle(sceneId);
  const xrSupported = await checkXrSupport(mode);
  reviewBridge.setState({ xrSupported });
  syncBridge(bundle, mode);

  let runtime: RuntimeApp;
  if (mode === "stage4-xr" || mode === "stage5-xr") {
    runtime = await XrReviewApp.create(sceneContainer, bundle);
  } else {
    runtime = await ViewerApp.create(sceneContainer, bundle);
  }

  renderReviewShell();
  const sceneId = url.searchParams.get("scene")?.trim() || "demo";
  const { startStageReview } = await import("./review/startStageReview.js");
  await startStageReview(mode as StageReviewMode, sceneId);
}

void start().catch((error: unknown) => {
  document.body.innerHTML = `
    <div id="app-root">
      <div class="fatal-shell">
        <div class="fatal-card">
          <p class="fatal-kicker">Application Error</p>
          <h1>Shot Caller failed to boot.</h1>
          <p>${error instanceof Error ? error.message : "Unknown startup error."}</p>
        </div>
      </div>
    </div>
  `;
});
// ── Entry point routing ─────────────────────────────────────────────────────
// (default)       → Web3D Planning Editor  — place cameras, lights, cast marks
// ?mode=stage4-xr → PICO VR walkthrough    — walk the scene you just blocked

const mode = parseMode(new URLSearchParams(window.location.search).get("mode"));

if (mode === "editor") {
  void bootstrapEditor();
} else {
  void bootstrapReview().catch((error: unknown) => {
    reviewBridge.setState({
      error: error instanceof Error ? error.message : "Application bootstrap failed.",
    });
  });
}
