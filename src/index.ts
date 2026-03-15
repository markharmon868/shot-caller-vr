import "./app.css";

import { resolveAppMode } from "./routing.js";
import {
  renderEditorShell,
  renderHeadsetEmptyShell,
  renderIntakeShell,
  renderVrShell,
  renderScoutShell,
} from "./shells.js";
import type { ScoutAgentPanelProps } from "./agui/ScoutAgentPanel.js";

/** Shared initialisation for the CopilotKit Scout Agent AG-UI panel. */
async function initScoutAgentPanel(props: ScoutAgentPanelProps = {}): Promise<void> {
  const { mountScoutAgent } = await import("./agui/mountScoutAgent.js");
  const { injectScoutAgentTheme } = await import("./agui/theme.js");
  injectScoutAgentTheme();
  mountScoutAgent(props);
}

async function start(): Promise<void> {
  const url = new URL(window.location.href);
  const mode = resolveAppMode(url, navigator.userAgent);

  if (mode === "landing") {
    const { renderLandingShell } = await import("./shells.js");
    renderLandingShell();
    return;
  }

  if (mode === "scout") {
    renderScoutShell();
    const { startScout, onGenerateClick } = await import("./scout/ScoutApp.js");
    (window as unknown as Record<string, unknown>).__scoutGenerate = onGenerateClick;
    startScout();

    // Mount CopilotKit Scout Agent AG-UI panel
    await initScoutAgentPanel();
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

    // Mount CopilotKit Scout Agent AG-UI panel
    const params = new URLSearchParams(window.location.search);
    await initScoutAgentPanel({
      sceneName: params.get("scene") ?? "Untitled Scene",
      splatUrl: params.get("splat") ?? undefined,
    });
    return;
  }

  // VR Preview
  renderVrShell();
  const sceneId = url.searchParams.get("scene")?.trim() || "demo";

  // Build back-to-editor URL preserving scene + splat params
  const backUrl = new URL("/?mode=editor", window.location.origin);
  if (sceneId && sceneId !== "demo") backUrl.searchParams.set("scene", sceneId);
  const splatParam = url.searchParams.get("splat");
  if (splatParam) backUrl.searchParams.set("splat", splatParam);
  const backLink = document.getElementById("vr-back-link") as HTMLAnchorElement;
  if (backLink) backLink.href = backUrl.toString();

  const enterBtn = document.getElementById("vr-enter-btn") as HTMLButtonElement;
  const errorDiv = document.getElementById("vr-error") as HTMLDivElement;
  const sceneContainer = document.getElementById("vr-scene") as HTMLDivElement;

  const showError = (msg: string) => {
    errorDiv.textContent = msg;
    errorDiv.style.display = "block";
  };

  const { loadSceneBundle } = await import("./data/sceneStore.js");
  const { XrReviewApp } = await import("./xrReviewApp.js");

  let bundle;
  try {
    bundle = await loadSceneBundle(sceneId);
  } catch (e) {
    enterBtn.textContent = "VR Unavailable";
    showError(`Failed to load scene "${sceneId}". ${e instanceof Error ? e.message : String(e)}`);
    return;
  }

  const app = await XrReviewApp.create(sceneContainer, bundle);

  // Check XR support
  type XrNavigator = Navigator & { xr?: { isSessionSupported(m: string): Promise<boolean> } };
  const xrSupported = await ((navigator as XrNavigator).xr?.isSessionSupported("immersive-vr") ?? Promise.resolve(false));

  if (xrSupported) {
    enterBtn.textContent = "Enter VR";
    enterBtn.disabled = false;
  } else {
    enterBtn.textContent = "Enter VR (desktop)";
    enterBtn.disabled = false;
  }

  let xrActive = false;
  enterBtn.addEventListener("click", () => {
    void app.enterOrExitXR().then(() => {
      xrActive = !xrActive;
      enterBtn.textContent = xrActive ? "Exit VR" : (xrSupported ? "Enter VR" : "Enter VR (desktop)");
    }).catch((err: unknown) => {
      showError(err instanceof Error ? err.message : "Failed to toggle VR.");
    });
  });

  window.addEventListener("beforeunload", () => { app.dispose(); });
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
