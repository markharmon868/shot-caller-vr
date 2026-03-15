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

  /* Gizmo toolbar */
  .gizmo-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; }
  .gizmo-btn {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 2px; padding: 6px 4px; background: #1a0d33; border: 1px solid #2d1a4a;
    border-radius: 5px; color: #a090bc; font-size: 8px; font-weight: 600;
    cursor: pointer; text-transform: uppercase; letter-spacing: 0.5px; transition: all 0.12s;
  }
  .gizmo-btn .icon { font-size: 14px; line-height: 1; }
  .gizmo-btn:hover { background: #2a1a40; color: #d0c0e8; }
  .gizmo-btn.active { background: #002a1a; border-color: #34d399; color: #34d399; }

  /* Sequence / review buttons */
  .btn-seq { border-color: #7c3aed; color: #c4b5fd; }
  .btn-seq:hover { background: #1a0d40; }
  .btn-seq.active { background: #1a0d40; border-color: #a78bfa; color: #a78bfa; }
  .btn-review { border-color: #0369a1; color: #7dd3fc; }
  .btn-review:hover { background: #0a1a2a; }
  .btn-review.active { background: #0a1a2a; border-color: #38bdf8; color: #38bdf8; }

  /* Sequence hint */
  #sequence-hint {
    display: none; padding: 5px 8px; border-radius: 4px;
    background: rgba(124,58,237,0.12); border: 1px solid rgba(167,139,250,0.3);
    color: #c4b5fd; font-size: 9px; line-height: 1.5; margin-top: 4px;
  }

  /* Shot review panel (inline overlay) */
  #shot-review-panel {
    display: none; flex-direction: column; gap: 4px;
    padding: 8px 10px; border-radius: 6px; margin-top: 6px;
    background: rgba(3,105,161,0.15); border: 1px solid rgba(56,189,248,0.25);
  }
  #shot-review-panel.visible { display: flex; }
  .review-row { display: flex; align-items: center; justify-content: space-between; gap: 4px; }
  #shot-review-number { color: #38bdf8; font-size: 11px; font-weight: 700; }
  #shot-review-type { color: #94a3b8; font-size: 9px; }
  #shot-review-label { color: #e2e8f0; font-size: 10px; font-style: italic; }
  .review-nav { display: flex; gap: 4px; }
  .review-nav button {
    background: #1a0d33; border: 1px solid #2d1a4a; border-radius: 4px;
    color: #a090bc; padding: 3px 8px; font-size: 11px; cursor: pointer;
  }
  .review-nav button:disabled { opacity: 0.3; cursor: default; }
  .review-nav button:not(:disabled):hover { border-color: #38bdf8; color: #38bdf8; }
  #shot-review-exit {
    background: none; border: none; color: #6b5a8a; font-size: 9px;
    cursor: pointer; text-align: right; padding: 0;
  }

  /* Camera preview overlay */
  #camera-preview-overlay {
    display: none; position: absolute; bottom: 12px; right: 12px;
    background: #04010e; border: 1px solid rgba(251,191,36,0.5);
    border-radius: 6px; overflow: hidden; pointer-events: none; z-index: 5;
    width: 240px;
  }
  #preview-img {
    display: block; width: 100%; aspect-ratio: 16/9; object-fit: cover;
  }
  #preview-label {
    color: #fbbf24; font-size: 9px; text-align: center; font-weight: 600;
    padding: 3px 6px; letter-spacing: 0.8px; text-transform: uppercase;
    background: rgba(4,1,14,0.85);
  }

  /* 3D Models section */
  .gltf-select {
    width: 100%; background: #1a0d33; border: 1px solid #2d1a4a;
    border-radius: 4px; color: #e2e8f0; padding: 5px 8px;
    font-size: 10px; margin-bottom: 5px; outline: none;
  }
  .gltf-select:focus { border-color: #f97316; }

  #gltf-drop-zone {
    border: 1px dashed #2d1a4a; border-radius: 6px; padding: 14px 10px;
    text-align: center; color: #3d2a5a; font-size: 9px;
    line-height: 1.6; cursor: pointer; transition: all 0.15s;
    margin-top: 5px;
  }
  #gltf-drop-zone:hover, #gltf-drop-zone.drag-over {
    border-color: #f97316; color: #fb923c; background: rgba(249,115,22,0.06);
  }
  #scene-container.drag-over::after {
    content: "Drop .glb / .gltf"; position: absolute; inset: 0;
    display: flex; align-items: center; justify-content: center;
    font-size: 24px; color: #fb923c;
    background: rgba(249,115,22,0.12); border: 2px dashed #f97316;
    border-radius: 4px; z-index: 30; pointer-events: none;
  }

  /* Preview in VR button */
  .btn-vr { border-color: #7c3aed; color: #c4b5fd; }
  .btn-vr:hover { background: #1a0d40; }
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

        <!-- Gaussian Scene -->
        <div class="sidebar-section">
          <div class="section-title">Gaussian Scene</div>
          <div class="spz-row">
            <input id="spz-url-input" type="text" placeholder=".spz or image URL…" />
          </div>
          <button id="load-splat-btn" class="btn" style="margin-top:6px">Load Scene</button>
        </div>

        <!-- Elements -->
        <div class="sidebar-section">
          <div class="section-title">Elements</div>
          <div class="tool-grid">
            <button class="tool-btn wide active" data-tool="select">
              <span class="icon">↖</span> Select
            </button>
            <button class="tool-btn" data-tool="camera">
              <span class="icon">🎥</span> Camera
            </button>
            <button class="tool-btn" data-tool="light">
              <span class="icon">💡</span> Light
            </button>
            <button class="tool-btn" data-tool="cast_mark">
              <span class="icon">✕</span> Actor
            </button>
            <button class="tool-btn" data-tool="crew">
              <span class="icon">🚶</span> Crew
            </button>
            <button class="tool-btn" data-tool="equipment">
              <span class="icon">🎬</span> Equipment
            </button>
            <button class="tool-btn" data-tool="props">
              <span class="icon">📦</span> Props
            </button>
          </div>
        </div>

        <!-- 3D Models -->
        <div class="sidebar-section">
          <div class="section-title">3D Models</div>
          <select id="gltf-model-select" class="gltf-select">
            <option value="">— no models in library —</option>
          </select>
          <button id="gltf-add-btn" class="btn" disabled>Add to Scene</button>
          <div id="gltf-drop-zone">
            Drop .glb / .gltf here<br>
            <span style="opacity:0.6">or drag onto the viewport</span>
          </div>
        </div>

        <!-- Transform -->
        <div class="sidebar-section">
          <div class="section-title">Transform &nbsp;<span style="color:#3d2a5a;font-weight:400">W / E / R</span></div>
          <div class="gizmo-row">
            <button class="gizmo-btn active" data-gizmo="translate">
              <span class="icon">↔</span> Move
            </button>
            <button class="gizmo-btn" data-gizmo="rotate">
              <span class="icon">↻</span> Rotate
            </button>
            <button class="gizmo-btn" data-gizmo="scale">
              <span class="icon">⤢</span> Scale
            </button>
          </div>
        </div>

        <!-- Shot Sequence -->
        <div class="sidebar-section">
          <div class="section-title">Shot Sequence</div>
          <button id="sequence-mode-btn" class="btn btn-seq">Sequence Mode</button>
          <button id="sequence-reset-btn" class="btn">Clear Sequence</button>
          <div id="sequence-hint">Click cameras in order to assign shot numbers</div>
        </div>

        <!-- Shot Review -->
        <div class="sidebar-section">
          <div class="section-title">Review</div>
          <button id="review-mode-btn" class="btn btn-review">Review Shots</button>
          <div id="shot-review-panel">
            <div class="review-row">
              <span id="shot-review-number">Shot 1</span>
              <button id="shot-review-exit">✕ Exit</button>
            </div>
            <div id="shot-review-type" style="color:#94a3b8;font-size:9px"></div>
            <div id="shot-review-label" style="color:#e2e8f0;font-size:10px;font-style:italic"></div>
            <div class="review-nav">
              <button id="shot-prev-btn">◀</button>
              <button id="shot-next-btn">▶</button>
            </div>
          </div>
        </div>

        <!-- Properties (shown when element selected) -->
        <div class="sidebar-section" id="properties-section">
          <div class="section-title">Properties</div>
          <div id="properties-panel"></div>
          <button id="delete-element-btn" class="btn btn-danger" style="margin-top:4px">Delete</button>
        </div>

        <!-- Actions -->
        <div class="sidebar-section">
          <div class="section-title">Actions</div>
          <button id="save-scene-btn" class="btn btn-primary">Save Scene</button>
          <button id="preview-vr-btn" class="btn btn-vr">Preview in VR</button>
          <button id="export-json-btn" class="btn">Export JSON</button>
        </div>

        <div id="status-bar">Ready</div>
      </div>

      <div id="scene-container">
        <div id="loading-overlay">
          <div id="loading-spinner"></div>
          <p id="loading-text">Loading scene…</p>
        </div>
        <div id="keyboard-hint">
          Orbit: left drag &nbsp;·&nbsp; Pan: right drag &nbsp;·&nbsp; Zoom: scroll<br>
          W = Move &nbsp;·&nbsp; E = Rotate &nbsp;·&nbsp; R = Scale &nbsp;·&nbsp; Del = Delete
        </div>
        <div id="camera-preview-overlay">
          <img id="preview-img" alt="" />
          <div id="preview-label"></div>
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
