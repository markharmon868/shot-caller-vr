const EDITOR_STYLE_ID = "shot-caller-editor-shell-style";

const editorStyles = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    margin: 0;
    background: #0d0221;
    font-family: system-ui, -apple-system, sans-serif;
    overflow: hidden;
  }

  #app {
    display: flex;
    width: 100vw;
    height: 100vh;
  }

  #editor-sidebar {
    display: none;
    flex-direction: column;
    width: 220px;
    min-width: 220px;
    background: #120828;
    border-right: 1px solid #2d1a4a;
    overflow-y: auto;
    z-index: 10;
  }
  #editor-sidebar.visible { display: flex; }

  .sidebar-header {
    padding: 16px 14px 12px;
    border-bottom: 1px solid #2d1a4a;
  }
  .sidebar-header h1 {
    color: #fbbf24;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 2.5px;
    text-transform: uppercase;
  }
  .sidebar-header p {
    color: #6b5a8a;
    font-size: 10px;
    margin-top: 2px;
  }

  .sidebar-section {
    padding: 10px 12px;
    border-bottom: 1px solid #1a0d33;
  }
  .section-title {
    color: #6b5a8a;
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    margin-bottom: 8px;
  }

  .spz-row { display: flex; gap: 6px; }
  #spz-url-input {
    flex: 1;
    background: #1a0d33;
    border: 1px solid #2d1a4a;
    border-radius: 4px;
    color: #e2e8f0;
    padding: 5px 8px;
    font-size: 10px;
    outline: none;
  }
  #spz-url-input::placeholder { color: #3d2a5a; }
  #spz-url-input:focus { border-color: #6b5a8a; }

  .tool-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 5px;
  }
  .tool-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 9px 6px;
    background: #1a0d33;
    border: 1px solid #2d1a4a;
    border-radius: 6px;
    color: #a090bc;
    font-size: 9px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.12s;
    user-select: none;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }
  .tool-btn:hover { background: #2a1a40; color: #d0c0e8; border-color: #3d2a5a; }
  .tool-btn.active {
    background: #2a1a00;
    border-color: #fbbf24;
    color: #fbbf24;
  }
  .tool-btn .icon { font-size: 16px; line-height: 1; }
  .tool-btn.wide { grid-column: 1 / -1; flex-direction: row; gap: 8px; padding: 7px 12px; }

  .btn {
    display: block;
    width: 100%;
    padding: 7px 12px;
    border-radius: 4px;
    font-size: 11px;
    cursor: pointer;
    text-align: center;
    transition: all 0.12s;
    margin-bottom: 5px;
    background: #1a0d33;
    border: 1px solid #2d1a4a;
    color: #a090bc;
    letter-spacing: 0.3px;
  }
  .btn:hover { background: #2a1a40; color: #d0c0e8; }
  .btn:last-child { margin-bottom: 0; }
  .btn-primary { background: #2a1a00; border-color: #fbbf24; color: #fbbf24; }
  .btn-primary:hover { background: #3a2a00; }
  .btn-danger { border-color: #7f1d1d; color: #fca5a5; }
  .btn-danger:hover { background: #2a0a0a; }

  #properties-section { display: none; }
  #properties-section.visible { display: block; }

  .prop-row { margin-bottom: 8px; }
  .prop-label {
    display: block;
    color: #6b5a8a;
    font-size: 9px;
    letter-spacing: 1px;
    text-transform: uppercase;
    margin-bottom: 3px;
  }
  .prop-input {
    width: 100%;
    background: #1a0d33;
    border: 1px solid #2d1a4a;
    border-radius: 4px;
    color: #e2e8f0;
    padding: 5px 8px;
    font-size: 11px;
    outline: none;
  }
  .prop-input:focus { border-color: #fbbf24; }
  .prop-input[type="range"] {
    padding: 2px 0;
    accent-color: #fbbf24;
    cursor: pointer;
  }
  .prop-value {
    float: right;
    color: #fbbf24;
    font-size: 10px;
  }

  #status-bar {
    margin-top: auto;
    padding: 8px 12px;
    border-top: 1px solid #1a0d33;
    color: #3d2a5a;
    font-size: 9px;
    line-height: 1.4;
  }

  #scene-container {
    flex: 1;
    position: relative;
    background: #000;
    overflow: hidden;
  }
  #scene-container canvas {
    display: block;
    width: 100% !important;
    height: 100% !important;
  }
  #scene-container.placing { cursor: crosshair; }

  #loading-overlay {
    display: none;
    position: absolute;
    inset: 0;
    background: rgba(13, 2, 33, 0.88);
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: 14px;
    z-index: 20;
  }
  #loading-overlay.visible { display: flex; }
  #loading-text { color: #c4b5d8; font-size: 13px; }
  #loading-spinner {
    width: 36px;
    height: 36px;
    border: 3px solid #2d1a4a;
    border-top-color: #fbbf24;
    border-radius: 50%;
    animation: shot-caller-spin 0.75s linear infinite;
  }
  @keyframes shot-caller-spin { to { transform: rotate(360deg); } }

  #keyboard-hint {
    position: absolute;
    bottom: 12px;
    right: 12px;
    background: rgba(18, 8, 40, 0.8);
    border: 1px solid #2d1a4a;
    border-radius: 6px;
    padding: 8px 12px;
    color: #6b5a8a;
    font-size: 10px;
    line-height: 1.8;
    display: none;
    pointer-events: none;
  }
  #keyboard-hint.visible { display: block; }
`;

function upsertEditorStyle(): void {
  let style = document.getElementById(EDITOR_STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = EDITOR_STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent = editorStyles;
}

function removeEditorStyle(): void {
  document.getElementById(EDITOR_STYLE_ID)?.remove();
}

export function renderEditorShell(): void {
  upsertEditorStyle();
  document.body.className = "shot-caller-body-editor";
  document.title = "Shot Caller Editor";
  document.body.innerHTML = `
    <div id="app">
      <div id="editor-sidebar">
        <div class="sidebar-header">
          <h1>Shot Caller</h1>
          <p>Production Blocking Tool</p>
        </div>

        <div class="sidebar-section">
          <div class="section-title">Scene</div>
          <div class="spz-row">
            <input id="spz-url-input" type="text" placeholder=".spz URL or paste from pipeline…" />
          </div>
          <button id="load-splat-btn" class="btn" style="margin-top:6px">Load Gaussian Scene</button>
        </div>

        <div class="sidebar-section">
          <div class="section-title">Place Elements</div>
          <div class="tool-grid">
            <button class="tool-btn wide active" data-tool="select">
              <span class="icon">↖</span> Select / Move
            </button>
            <button class="tool-btn" data-tool="camera">
              <span class="icon">🎥</span> Camera
            </button>
            <button class="tool-btn" data-tool="light">
              <span class="icon">💡</span> Light
            </button>
            <button class="tool-btn" data-tool="cast_mark">
              <span class="icon">✕</span> Cast Mark
            </button>
            <button class="tool-btn" data-tool="crew">
              <span class="icon">🚶</span> Crew
            </button>
            <button class="tool-btn" data-tool="equipment">
              <span class="icon">🎬</span> Equipment
            </button>
          </div>
        </div>

        <div class="sidebar-section" id="properties-section">
          <div class="section-title">Properties</div>
          <div id="properties-panel"></div>
          <button id="delete-element-btn" class="btn btn-danger" style="margin-top:4px">Delete Element</button>
        </div>

        <div class="sidebar-section">
          <div class="section-title">Scene</div>
          <button id="save-scene-btn" class="btn btn-primary">Save Scene</button>
          <button id="export-json-btn" class="btn">Export JSON</button>
        </div>

        <div id="status-bar">Ready — load a .spz scene or start placing elements</div>
      </div>

      <div id="scene-container">
        <div id="loading-overlay">
          <div id="loading-spinner"></div>
          <p id="loading-text">Loading scene…</p>
        </div>
        <div id="keyboard-hint">
          Orbit: left drag &nbsp;·&nbsp; Pan: right drag<br>
          Zoom: scroll &nbsp;·&nbsp; Place: click<br>
          Cancel: Escape &nbsp;·&nbsp; Delete: Del/Backspace<br>
          Rotate selected: R / Shift+R
        </div>
      </div>
    </div>
  `;
}

export function renderReviewShell(): void {
  removeEditorStyle();
  document.body.className = "shot-caller-body-review";
  document.title = "Shot Caller Review";
  document.body.innerHTML = `
    <div id="app-root" class="app-root-review">
      <div id="scene-container"></div>
      <div id="shell-root"></div>
    </div>
  `;
}

export function renderIntakeShell(): void {
  removeEditorStyle();
  document.body.className = "shot-caller-body-intake";
  document.title = "Shot Caller Intake";
  document.body.innerHTML = `
    <div id="app-root" class="app-root-intake">
      <div id="intake-root"></div>
    </div>
  `;
}

export function renderHeadsetEmptyShell(): void {
  removeEditorStyle();
  document.body.className = "shot-caller-body-static";
  document.title = "Shot Caller";
  document.body.innerHTML = `
    <div id="app-root" class="app-root-static">
      <div class="headset-empty-shell">
        <div class="headset-empty-card">
          <p class="headset-empty-kicker">VR Walkthrough Unavailable</p>
          <h1>A generated scene is required before XR review can start.</h1>
          <p>
            Open Shot Caller on a desktop browser to complete intake and world generation first,
            then reopen the scene URL on your headset.
          </p>
        </div>
      </div>
    </div>
  `;
}
