import "./app.css";

import { resolveAppMode } from "./routing.js";
import {
  renderCreateShell,
  renderEditorShell,
  renderExportShell,
  renderHeadsetEmptyShell,
  renderHomeShell,
  renderIntakeShell,
  renderReviewShell,
} from "./shells.js";

async function start(): Promise<void> {
  const url = new URL(window.location.href);
  const mode = resolveAppMode(url, navigator.userAgent);

  if (mode === "home") {
    renderHomeShell();
    return;
  }

  if (mode === "create") {
    renderCreateShell();
    const { startCreate } = await import("./create/CreateApp.js");
    startCreate();
    return;
  }

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

  if (mode === "export") {
    renderExportShell();
    const sceneId = url.searchParams.get("scene")?.trim() || "demo";
    const { startExport } = await import("./export/ExportApp.js");
    await startExport(sceneId);
    return;
  }

  // stage4-xr, stage5-xr, viewer
  renderReviewShell();
  const sceneId = url.searchParams.get("scene")?.trim() || "demo";
  const { startStageReview } = await import("./review/startStageReview.js");
  await startStageReview(mode, sceneId);
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
