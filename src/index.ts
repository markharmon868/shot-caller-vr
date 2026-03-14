import "./app.css";

import {
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

function parseMode(value: string | null): StageReviewMode {
  switch (value) {
    case "stage4-xr":
    case "stage5-xr":
    case "viewer":
    case "export":
      return value;
    default:
      return "viewer";
  }
}

async function checkXrSupport(mode: StageReviewMode): Promise<boolean> {
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
  if (runtime instanceof ViewerApp || runtime instanceof XrReviewApp) {
    runtime.updateIssues();
  }
}

async function bootstrap(): Promise<void> {
  const sceneContainer = document.getElementById("scene-container") as HTMLDivElement | null;
  const shellRoot = document.getElementById("shell-root") as HTMLDivElement | null;
  if (!sceneContainer || !shellRoot) {
    throw new Error("Missing root containers.");
  }

  const url = new URL(window.location.href);
  const sceneId = url.searchParams.get("scene") ?? "demo";
  const mode = parseMode(url.searchParams.get("mode"));
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

  const updateBridge = (error: string | null = null) => {
    syncBridge(bundle, mode, error);
    reviewBridge.setState({
      selectedLabel:
        runtime instanceof XrReviewApp
          ? runtime.getFocusedElementLabel()
          : reviewBridge.getState().selectedLabel,
    });
  };

  const persistReviewIssues = () => {
    saveReviewIssues(bundle.scene.sceneId, bundle.scene.reviewIssues);
    syncRuntimeIssues(runtime, bundle);
    updateBridge();
  };

  const persistApproval = () => {
    saveApproval(bundle.scene.sceneId, bundle.scene.approval);
    updateBridge();
  };

  const persistExportState = () => {
    saveExportState(bundle.scene.sceneId, bundle.scene.exportState);
    shell.setExportPreview(bundle.scene.exportState.lastCaptureDataUrl || null);
    updateBridge();
  };

  reviewBridge.setActions({
    toggleXR: () => {
      if (!(runtime instanceof XrReviewApp)) {
        reviewBridge.setState({ error: "XR is only available in stage4-xr and stage5-xr modes." });
        return;
      }

      if (!xrSupported && !reviewBridge.getState().xrActive) {
        reviewBridge.setState({ error: "immersive-vr is not supported in this browser." });
        return;
      }

      if (mode === "stage5-xr" && deriveSceneStatus(bundle) !== "validated") {
        reviewBridge.setState({
          error: "Stage 5 XR requires a validated scene before final review can begin.",
        });
        return;
      }

      if (!runtime.canEnterImmersive() && !reviewBridge.getState().xrActive) {
        reviewBridge.setState({
          error: "This scene has no collider mesh. XR review is blocked until a collider is provided.",
        });
        return;
      }

      void runtime.enterOrExitXR().then(() => updateBridge()).catch((error: unknown) => {
        reviewBridge.setState({
          error: error instanceof Error ? error.message : "Failed to toggle XR.",
        });
      });
    },
    primaryAction: () => {
      if (!reviewBridge.getState().xrActive) {
        if (mode === "export" && runtime instanceof ViewerApp) {
          const dataUrl = runtime.captureTopDown();
          bundle.scene.exportState = {
            status: "ready",
            lastCaptureDataUrl: dataUrl,
            requestedAt: "",
            lastPayload: "",
          };
          persistExportState();
          return;
        }
        if (mode === "stage4-xr" || mode === "stage5-xr") {
          reviewBridge.getActions()?.toggleXR();
        }
        return;
      }

      if (!(runtime instanceof XrReviewApp)) return;

      if (mode === "stage4-xr") {
        const now = new Date().toISOString();
        const issue: ReviewIssue = {
          id: `issue-${Date.now()}`,
          sceneRevision: bundle.scene.revision,
          elementId: runtime.getFocusedElementId() ?? undefined,
          mode,
          note: runtime.getFocusedElementLabel()
            ? `Blocked clearance near ${runtime.getFocusedElementLabel()}`
            : "Stage 4 review issue",
          severity: "medium",
          reviewPose: runtime.getViewerPose(),
          status: "open",
          createdAt: now,
          updatedAt: now,
        };
        bundle.scene.reviewIssues = [...bundle.scene.reviewIssues, issue];
        persistReviewIssues();
        return;
      }

      bundle.scene.approval = {
        status: "approved",
        reviewer: "PICO final review",
        decidedAt: new Date().toISOString(),
        sceneRevision: bundle.scene.revision,
        note: "Approved in stage5-xr final review.",
      };
      persistApproval();
    },
    secondaryAction: () => {
      if (!reviewBridge.getState().xrActive) {
        if (mode === "export") {
          const floorplanDataUrl = bundle.scene.exportState.lastCaptureDataUrl;
          if (!floorplanDataUrl) {
            reviewBridge.setState({ error: "Capture the export preview before queueing payload." });
            return;
          }
          bundle.scene.exportState = {
            status: "requested",
            lastCaptureDataUrl: floorplanDataUrl,
            requestedAt: new Date().toISOString(),
            lastPayload: JSON.stringify({
              sceneId: bundle.scene.sceneId,
              revision: bundle.scene.revision,
              floorplanDataUrl,
              requestedAt: new Date().toISOString(),
            }),
          };
          persistExportState();
        }
        return;
      }

      if (mode === "stage4-xr") {
        const latestIssue = getLatestOpenIssue(bundle.scene.reviewIssues);
        if (!latestIssue) {
          reviewBridge.setState({ error: "There is no open issue to resolve." });
          return;
        }
        latestIssue.status = "resolved";
        latestIssue.updatedAt = new Date().toISOString();
        persistReviewIssues();
        return;
      }

      bundle.scene.approval = {
        status: "rejected",
        reviewer: "PICO final review",
        decidedAt: new Date().toISOString(),
        sceneRevision: bundle.scene.revision,
        note: "Rejected in stage5-xr final review.",
      };
      persistApproval();
    },
  });

  shell.setExportPreview(bundle.scene.exportState.lastCaptureDataUrl || null);
  updateBridge();

  window.addEventListener("beforeunload", () => {
    runtime.dispose();
  });
}

void bootstrap().catch((error: unknown) => {
  reviewBridge.setState({
    error: error instanceof Error ? error.message : "Application bootstrap failed.",
  });
});
