import { StageReviewMode } from "./contracts/stageReview.js";
import {
  getPrimaryActionLabel,
  getSecondaryActionLabel,
  reviewBridge,
} from "./reviewBridge.js";

export interface BrowserShell {
  setExportPreview(dataUrl: string | null): void;
}

const MODE_OPTIONS: StageReviewMode[] = ["stage4-xr", "stage5-xr", "viewer", "export"];

export function createBrowserShell(root: HTMLElement): BrowserShell {
  root.innerHTML = `
    <div class="shell-card">
      <div class="shell-header">
        <div>
          <p class="shell-kicker">Stage 4 / 5 Review</p>
          <h1>Shot Caller</h1>
        </div>
        <label class="shell-field">
          <span>Mode</span>
          <select id="mode-select"></select>
        </label>
      </div>
      <div class="shell-grid">
        <div class="shell-stat">
          <span class="shell-label">Scene</span>
          <strong id="scene-value">demo</strong>
        </div>
        <div class="shell-stat">
          <span class="shell-label">Status</span>
          <strong id="status-value">draft</strong>
        </div>
        <div class="shell-stat">
          <span class="shell-label">Selection</span>
          <strong id="selection-value">none</strong>
        </div>
        <div class="shell-stat">
          <span class="shell-label">Issues</span>
          <strong id="issues-value">0</strong>
        </div>
      </div>
      <p id="error-value" class="shell-error" hidden></p>
      <div class="shell-actions">
        <button id="xr-button" class="shell-button">Enter XR</button>
        <button id="primary-button" class="shell-button shell-button-primary">Primary Action</button>
        <button id="secondary-button" class="shell-button shell-button-danger">Secondary Action</button>
      </div>
      <div class="shell-preview">
        <div class="shell-preview-header">
          <span>Export Preview</span>
          <span class="shell-preview-hint">Top-down orthographic capture</span>
        </div>
        <img id="export-preview" alt="Export preview" hidden />
        <p id="export-empty">No capture yet.</p>
      </div>
    </div>
  `;

  const modeSelect = root.querySelector<HTMLSelectElement>("#mode-select");
  const sceneValue = root.querySelector<HTMLElement>("#scene-value");
  const statusValue = root.querySelector<HTMLElement>("#status-value");
  const selectionValue = root.querySelector<HTMLElement>("#selection-value");
  const issuesValue = root.querySelector<HTMLElement>("#issues-value");
  const errorValue = root.querySelector<HTMLElement>("#error-value");
  const xrButton = root.querySelector<HTMLButtonElement>("#xr-button");
  const primaryButton = root.querySelector<HTMLButtonElement>("#primary-button");
  const secondaryButton = root.querySelector<HTMLButtonElement>("#secondary-button");
  const exportPreview = root.querySelector<HTMLImageElement>("#export-preview");
  const exportEmpty = root.querySelector<HTMLElement>("#export-empty");

  if (
    !modeSelect ||
    !sceneValue ||
    !statusValue ||
    !selectionValue ||
    !issuesValue ||
    !errorValue ||
    !xrButton ||
    !primaryButton ||
    !secondaryButton ||
    !exportPreview ||
    !exportEmpty
  ) {
    throw new Error("Browser shell failed to initialize.");
  }

  modeSelect.innerHTML = MODE_OPTIONS.map(
    (mode) => `<option value="${mode}">${mode}</option>`,
  ).join("");

  const syncModeSelect = (mode: StageReviewMode) => {
    modeSelect.value = mode;
  };

  modeSelect.addEventListener("change", () => {
    const nextMode = modeSelect.value as StageReviewMode;
    const url = new URL(window.location.href);
    url.searchParams.set("mode", nextMode);
    window.location.assign(url.toString());
  });

  xrButton.addEventListener("click", () => {
    reviewBridge.getActions()?.toggleXR();
  });
  primaryButton.addEventListener("click", () => {
    reviewBridge.getActions()?.primaryAction();
  });
  secondaryButton.addEventListener("click", () => {
    reviewBridge.getActions()?.secondaryAction();
  });

  reviewBridge.subscribe((state) => {
    syncModeSelect(state.mode);
    sceneValue.textContent = state.sceneId;
    statusValue.textContent = `${state.sceneStatus} / ${state.approvalStatus}`;
    selectionValue.textContent = state.selectedLabel ?? "none";
    issuesValue.textContent = String(state.issueCount);
    xrButton.textContent = state.xrActive ? "Exit XR" : "Toggle XR";
    xrButton.disabled = !state.xrSupported && !state.xrActive;
    primaryButton.textContent = getPrimaryActionLabel(state.mode, state.xrActive);
    secondaryButton.textContent = getSecondaryActionLabel(state.mode, state.xrActive);
    primaryButton.disabled = primaryButton.textContent === "No Primary Action";
    secondaryButton.disabled = secondaryButton.textContent === "No Secondary Action";
    errorValue.hidden = !state.error;
    errorValue.textContent = state.error ?? "";
  });

  return {
    setExportPreview(dataUrl) {
      exportPreview.hidden = !dataUrl;
      exportEmpty.hidden = Boolean(dataUrl);
      if (dataUrl) {
        exportPreview.src = dataUrl;
      } else {
        exportPreview.removeAttribute("src");
      }
    },
  };
}
