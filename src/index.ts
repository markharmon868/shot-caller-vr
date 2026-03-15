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
