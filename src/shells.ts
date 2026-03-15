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
    display: flex;
    flex-direction: column;
    width: 220px;
    min-width: 220px;
    background: #120828;
    border-right: 1px solid #2d1a4a;
    overflow-y: auto;
    z-index: 10;
  }

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
  .splat-offset-row {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 10px;
    color: #9d8cbf;
  }
  .splat-offset-row label { width: 10px; flex-shrink: 0; }
  .splat-offset-row input[type=range] { flex: 1; accent-color: #7c5cbf; }
  .splat-offset-row span { width: 32px; text-align: right; font-size: 9px; color: #6b5a8a; font-variant-numeric: tabular-nums; }
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

  /* Asset catalog accordion */
  .cat-header {
    display: flex; align-items: center; gap: 6px;
    padding: 7px 4px; cursor: pointer; border-radius: 4px;
    color: #a090bc; font-size: 10px; font-weight: 600;
    letter-spacing: 0.3px; user-select: none;
    transition: all 0.12s;
  }
  .cat-header:hover { color: #d0c0e8; background: rgba(255,255,255,0.03); }
  .cat-chevron { font-size: 8px; color: #3d2a5a; transition: transform 0.15s; margin-left: auto; }
  .cat-header.open .cat-chevron { transform: rotate(90deg); color: #6b5a8a; }
  .cat-header.open { color: #d0c0e8; }

  .cat-items { display: none; padding-bottom: 4px; }
  .cat-items.open { display: block; }

  .cat-item {
    display: flex; align-items: center; justify-content: space-between;
    gap: 6px; padding: 6px 8px; border-radius: 5px; cursor: pointer;
    margin-bottom: 2px; border: 1px solid transparent;
    transition: all 0.12s;
  }
  .cat-item:hover { background: #1a0d33; border-color: #2d1a4a; }
  .cat-item.active {
    background: #1a0a00; border-color: #f59e0b;
  }
  .cat-item-name {
    font-size: 9px; color: #c4b5d8; line-height: 1.3;
    flex: 1; min-width: 0;
  }
  .cat-item.active .cat-item-name { color: #fbbf24; }
  .cat-item-rate {
    font-size: 8px; color: #34d399; font-variant-numeric: tabular-nums;
    white-space: nowrap; flex-shrink: 0; font-weight: 600;
  }

  #gltf-drop-zone {
    border: 1px dashed #2d1a4a; border-radius: 6px; padding: 10px;
    text-align: center; color: #3d2a5a; font-size: 9px;
    line-height: 1.6; cursor: pointer; transition: all 0.15s;
    margin-top: 6px;
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
          <div id="scene-title" contenteditable="true" spellcheck="false"
               style="font-size:10px;color:#6b7280;padding:2px 4px;border-radius:3px;outline:none;cursor:text;"
               title="Click to rename scene">Untitled Scene</div>
        </div>

        <!-- Gaussian Scene -->
        <div class="sidebar-section">
          <div class="section-title">Gaussian Scene</div>
          <div class="spz-row">
            <input id="spz-url-input" type="text" placeholder=".spz or image URL…" />
          </div>
          <button id="load-splat-btn" class="btn" style="margin-top:6px">Load Scene</button>

          <!-- Splat vertical offset (collapsible) -->
          <div style="margin-top:8px;">
            <button id="splat-offset-toggle" class="btn" style="font-size:9px;padding:3px 8px;width:100%;text-align:left;">
              ▶ Adjust Height
            </button>
            <div id="splat-offset-panel" style="display:none;padding-top:8px;">
              <div class="splat-offset-row">
                <label>Y</label>
                <input id="splat-offset-y" type="range" min="-10" max="10" step="0.05" value="0" />
                <span id="splat-offset-y-val">0.00</span>
              </div>
              <button id="splat-offset-reset" class="btn" style="margin-top:4px;font-size:9px;padding:3px 8px;">Reset</button>
            </div>
          </div>
        </div>

        <!-- Select Tool -->
        <div class="sidebar-section" style="padding-bottom:8px">
          <button class="tool-btn wide active" data-tool="select" id="select-tool-btn">
            <span class="icon">↖</span> Select / Move
          </button>
          <!-- Cast / Crew quick-place -->
          <div class="tool-grid" style="margin-top:6px">
            <button class="tool-btn" data-tool="cast_mark">
              <span class="icon">✕</span> Actor Mark
            </button>
            <button class="tool-btn" data-tool="crew">
              <span class="icon">🚶</span> Crew
            </button>
          </div>
        </div>

        <!-- Asset Library accordion (built dynamically) -->
        <div class="sidebar-section">
          <div class="section-title">Asset Library</div>
          <div id="asset-catalog-accordion">
            <div style="color:#3d2a5a;font-size:9px;text-align:center;padding:10px 0">
              Loading catalog…
            </div>
          </div>
          <div id="gltf-drop-zone" style="margin-top:8px">
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
            <div id="shot-review-position" style="color:#374151;font-size:10px;margin-top:2px"></div>
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
          <button id="export-json-btn" class="btn">Export Call Sheet PDF</button>
          <button id="export-pdf-btn" class="btn">Export Shot List PDF</button>
          <button id="clear-scene-btn" class="btn btn-danger" style="margin-top:4px">Clear Scene</button>
          <button id="clear-elements-btn" class="btn btn-danger" style="margin-top:2px;display:none">Clear Elements</button>
        </div>

        <div id="status-bar">
          <span id="status-msg">Ready</span>
          <span id="element-count" style="color:#6b7280;font-size:10px"></span>
        </div>
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

export function renderVrShell(): void {
  removeEditorStyle();
  document.body.className = "";
  document.title = "Shot Caller — VR Preview";
  document.body.style.cssText = "margin:0;padding:0;background:#000;overflow:hidden;";
  document.body.innerHTML = `
    <style>
      #vr-scene { position:fixed;inset:0;z-index:0; }
      #vr-overlay {
        position:fixed;top:16px;left:16px;z-index:10;
        display:flex;flex-direction:column;gap:8px;
        font-family:system-ui,sans-serif;
      }
      #vr-enter-btn {
        padding:10px 20px;border-radius:8px;border:none;
        background:linear-gradient(135deg,#f59e0b,#ef4444);
        color:#111;font-size:14px;font-weight:700;cursor:pointer;
        letter-spacing:0.5px;transition:opacity 0.15s;min-width:130px;
      }
      #vr-enter-btn:disabled { opacity:0.4;cursor:not-allowed; }
      #vr-enter-btn:not(:disabled):hover { opacity:0.85; }
      #vr-back-link {
        display:inline-block;padding:8px 14px;border-radius:8px;
        background:rgba(13,15,20,0.8);border:1px solid #1e2330;
        color:#9ca3af;font-size:12px;text-decoration:none;
        transition:color 0.15s,border-color 0.15s;text-align:center;
      }
      #vr-back-link:hover { color:#e5e7eb;border-color:#374151; }
      #vr-error {
        display:none;padding:10px 14px;border-radius:8px;
        background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);
        color:#f87171;font-size:12px;max-width:260px;line-height:1.4;
      }
    </style>
    <div id="vr-scene"></div>
    <div id="vr-overlay">
      <button id="vr-enter-btn" disabled>Loading…</button>
      <a id="vr-back-link" href="/">← Editor</a>
      <div id="vr-error"></div>
    </div>
  `;
}

export function renderLandingShell(): void {
  removeEditorStyle();
  document.body.className = "";
  document.title = "Shot Caller — AI Production Blocking for Filmmakers";
  document.body.style.cssText = "margin:0;padding:0;overflow-x:hidden;";
  document.body.innerHTML = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');

      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

      :root {
        --bg: #07080c;
        --surface: #0d0f14;
        --raised: #131620;
        --border: #1a1d28;
        --accent: #f59e0b;
        --accent2: #ef4444;
        --text: #e5e7eb;
        --muted: #6b7280;
        --dim: #374151;
        --mono: 'IBM Plex Mono', monospace;
        --sans: 'IBM Plex Sans', system-ui, sans-serif;
      }

      body {
        background: var(--bg);
        color: var(--text);
        font-family: var(--sans);
        line-height: 1.6;
      }

      /* ── Nav ── */
      nav {
        position: fixed; top: 0; left: 0; right: 0; z-index: 100;
        display: flex; align-items: center; justify-content: space-between;
        padding: 16px 48px;
        background: rgba(7,8,12,0.85);
        backdrop-filter: blur(12px);
        border-bottom: 1px solid var(--border);
      }
      .nav-logo {
        font-family: var(--mono); font-size: 13px; font-weight: 700;
        letter-spacing: 3px; text-transform: uppercase;
        color: var(--accent); text-decoration: none;
      }
      .nav-links { display: flex; align-items: center; gap: 32px; }
      .nav-links a {
        font-size: 12px; font-family: var(--mono); letter-spacing: 1px;
        color: var(--muted); text-decoration: none;
        transition: color 0.15s;
      }
      .nav-links a:hover { color: var(--text); }
      .nav-cta {
        padding: 8px 20px; border-radius: 6px;
        background: var(--accent); color: #0a0500 !important;
        font-weight: 700 !important; font-size: 11px !important;
        letter-spacing: 1px !important; transition: opacity 0.15s !important;
      }
      .nav-cta:hover { opacity: 0.85 !important; color: #0a0500 !important; }

      /* ── Hero ── */
      .hero {
        min-height: 100vh;
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        text-align: center;
        padding: 120px 24px 80px;
        position: relative; overflow: hidden;
      }
      .hero::before {
        content: '';
        position: absolute; inset: 0;
        background: radial-gradient(ellipse 80% 60% at 50% 40%, rgba(245,158,11,0.07) 0%, transparent 70%),
                    radial-gradient(ellipse 50% 40% at 80% 80%, rgba(239,68,68,0.05) 0%, transparent 60%);
        pointer-events: none;
      }
      .hero-kicker {
        font-family: var(--mono); font-size: 11px; letter-spacing: 3px;
        text-transform: uppercase; color: var(--accent);
        margin-bottom: 20px;
        display: flex; align-items: center; gap: 10px;
      }
      .hero-kicker::before, .hero-kicker::after {
        content: ''; flex: 1 1 40px; max-width: 40px;
        height: 1px; background: var(--accent); opacity: 0.4;
      }
      .hero h1 {
        font-family: var(--mono); font-size: clamp(36px, 6vw, 72px);
        font-weight: 700; line-height: 1.1;
        letter-spacing: -1px;
        margin-bottom: 24px;
      }
      .hero h1 span { color: var(--accent); }
      .hero-sub {
        font-size: clamp(16px, 2vw, 20px); font-weight: 300;
        color: var(--muted); max-width: 560px;
        margin: 0 auto 48px;
        line-height: 1.7;
      }
      .hero-sub strong { color: var(--text); font-weight: 500; }
      .hero-actions { display: flex; gap: 16px; flex-wrap: wrap; justify-content: center; }
      .btn-primary-lg {
        padding: 16px 40px; border-radius: 8px; border: none;
        background: linear-gradient(135deg, var(--accent), #f97316);
        color: #0a0500; font-size: 14px; font-weight: 700;
        font-family: var(--mono); letter-spacing: 1px;
        cursor: pointer; text-decoration: none; display: inline-block;
        transition: transform 0.15s, box-shadow 0.15s;
        box-shadow: 0 0 32px rgba(245,158,11,0.25);
      }
      .btn-primary-lg:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 40px rgba(245,158,11,0.35);
      }
      .btn-ghost-lg {
        padding: 15px 32px; border-radius: 8px;
        border: 1px solid var(--border); background: transparent;
        color: var(--muted); font-size: 13px; font-family: var(--mono);
        letter-spacing: 1px; cursor: pointer; text-decoration: none;
        display: inline-block; transition: border-color 0.15s, color 0.15s;
      }
      .btn-ghost-lg:hover { border-color: var(--dim); color: var(--text); }

      /* ── Workflow steps ── */
      .section {
        padding: 100px 48px;
        max-width: 1200px; margin: 0 auto;
      }
      .section-label {
        font-family: var(--mono); font-size: 11px; letter-spacing: 3px;
        text-transform: uppercase; color: var(--accent);
        margin-bottom: 16px;
      }
      .section-title {
        font-family: var(--mono); font-size: clamp(24px, 3vw, 36px);
        font-weight: 700; margin-bottom: 48px;
        line-height: 1.2;
      }
      .steps {
        display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 2px;
      }
      .step {
        background: var(--surface);
        border: 1px solid var(--border);
        padding: 40px 32px;
        position: relative;
        transition: border-color 0.2s;
      }
      .step:first-child { border-radius: 12px 0 0 12px; }
      .step:last-child { border-radius: 0 12px 12px 0; }
      .step:hover { border-color: var(--dim); }
      .step-num {
        font-family: var(--mono); font-size: 11px; letter-spacing: 2px;
        color: var(--muted); margin-bottom: 20px;
        text-transform: uppercase;
      }
      .step-icon {
        font-size: 36px; margin-bottom: 16px; display: block;
        line-height: 1;
      }
      .step h3 {
        font-family: var(--mono); font-size: 16px; font-weight: 700;
        margin-bottom: 12px; color: var(--text);
      }
      .step p { font-size: 14px; color: var(--muted); line-height: 1.7; }
      .step-tag {
        margin-top: 20px; display: inline-block;
        font-family: var(--mono); font-size: 10px; letter-spacing: 1px;
        padding: 4px 10px; border-radius: 4px;
        background: rgba(245,158,11,0.1); color: var(--accent);
        border: 1px solid rgba(245,158,11,0.2);
      }

      /* ── Divider ── */
      .divider {
        height: 1px; background: var(--border);
        margin: 0 48px;
      }

      /* ── Features grid ── */
      .features {
        display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 1px; border: 1px solid var(--border);
        border-radius: 12px; overflow: hidden;
      }
      .feature {
        background: var(--surface);
        padding: 36px 32px;
        transition: background 0.2s;
      }
      .feature:hover { background: var(--raised); }
      .feature-icon {
        font-size: 28px; margin-bottom: 16px; display: block;
      }
      .feature h3 {
        font-family: var(--mono); font-size: 13px; font-weight: 700;
        letter-spacing: 0.5px; margin-bottom: 10px; color: var(--text);
      }
      .feature p { font-size: 13px; color: var(--muted); line-height: 1.7; }
      .feature-badge {
        display: inline-block; margin-top: 16px;
        font-family: var(--mono); font-size: 9px; letter-spacing: 1.5px;
        padding: 3px 8px; border-radius: 3px; text-transform: uppercase;
        background: rgba(239,68,68,0.1); color: #f87171;
        border: 1px solid rgba(239,68,68,0.2);
      }

      /* ── CTA section ── */
      .cta-section {
        text-align: center;
        padding: 100px 48px 120px;
        position: relative;
      }
      .cta-section::before {
        content: '';
        position: absolute; inset: 0;
        background: radial-gradient(ellipse 60% 80% at 50% 50%, rgba(245,158,11,0.05) 0%, transparent 70%);
        pointer-events: none;
      }
      .cta-section h2 {
        font-family: var(--mono); font-size: clamp(28px, 4vw, 48px);
        font-weight: 700; margin-bottom: 16px; line-height: 1.2;
      }
      .cta-section p {
        font-size: 16px; color: var(--muted); margin-bottom: 48px;
        max-width: 480px; margin-left: auto; margin-right: auto;
      }

      /* ── Footer ── */
      footer {
        border-top: 1px solid var(--border);
        padding: 32px 48px;
        display: flex; justify-content: space-between; align-items: center;
        flex-wrap: wrap; gap: 12px;
      }
      footer p { font-family: var(--mono); font-size: 11px; color: var(--dim); }
      footer a { color: var(--muted); text-decoration: none; font-family: var(--mono); font-size: 11px; }
      footer a:hover { color: var(--text); }
      .footer-links { display: flex; gap: 24px; }

      @media (max-width: 768px) {
        nav { padding: 14px 20px; }
        .nav-links { gap: 16px; }
        .section { padding: 60px 20px; }
        .step:first-child, .step:last-child { border-radius: 0; }
        .steps { gap: 1px; }
        footer { padding: 24px 20px; }
      }
    </style>

    <!-- Nav -->
    <nav>
      <a class="nav-logo" href="/">Shot Caller</a>
      <div class="nav-links">
        <a href="#workflow">Workflow</a>
        <a href="#features">Features</a>
        <a href="/?mode=scout" class="nav-cta">Start Scouting →</a>
      </div>
    </nav>

    <!-- Hero -->
    <section class="hero">
      <div class="hero-kicker">AI-Powered Production Tool</div>
      <h1>Block your shots<br>before you <span>set foot</span> on set.</h1>
      <p class="hero-sub">
        Pick any location on Google Maps, generate a <strong>photorealistic 3D scene</strong>
        from Street View, then place your cameras, cast, and crew — all before production day.
      </p>
      <div class="hero-actions">
        <a href="/?mode=scout" class="btn-primary-lg">Start Scouting →</a>
        <a href="/?mode=editor" class="btn-ghost-lg">Open Editor</a>
      </div>
    </section>

    <div class="divider"></div>

    <!-- Workflow -->
    <section id="workflow" style="padding:100px 0;">
      <div class="section">
        <div class="section-label">How it works</div>
        <div class="section-title">From location to locked shot list<br>in three steps.</div>
        <div class="steps">
          <div class="step">
            <div class="step-num">Step 01</div>
            <span class="step-icon">🗺</span>
            <h3>Scout the Location</h3>
            <p>Drop a pin anywhere on Google Maps. Shot Caller captures 24 Street View angles and submits them to Marble Labs to generate a photorealistic Gaussian splat — the real location as a 3D world model.</p>
            <span class="step-tag">Google Maps · Street View · Marble Labs</span>
          </div>
          <div class="step">
            <div class="step-num">Step 02</div>
            <span class="step-icon">🎬</span>
            <h3>Block the Scene</h3>
            <p>Place cameras, cast marks, crew, and equipment inside the splat. Sequence shots in shooting order, review them with orbital camera moves, and export a shot list PDF — all in the browser.</p>
            <span class="step-tag">3D Editor · Shot Sequencer · PDF Export</span>
          </div>
          <div class="step">
            <div class="step-num">Step 03</div>
            <span class="step-icon">🥽</span>
            <h3>Walk the Set in VR</h3>
            <p>Hit "Preview in VR" and walk the blocked scene on a PICO headset or desktop emulator. See your shot positions at real scale before a single light stand hits the ground.</p>
            <span class="step-tag">WebXR · PICO · Desktop Emulator</span>
          </div>
        </div>
      </div>
    </section>

    <div class="divider"></div>

    <!-- Features -->
    <section id="features" style="padding:100px 0;">
      <div class="section">
        <div class="section-label">Features</div>
        <div class="section-title">Built for directors,<br>DPs, and ADs.</div>
        <div class="features">
          <div class="feature">
            <span class="feature-icon">🌐</span>
            <h3>Gaussian Splat World Models</h3>
            <p>Every generated scene is a true photorealistic 3D splat — not a 3D model or a 360° photo. Walk through it, orbit it, or view it in VR at full scale.</p>
          </div>
          <div class="feature">
            <span class="feature-icon">📷</span>
            <h3>Camera Placement & Shot Types</h3>
            <p>Place cameras with shot type labels (WS, MS, CU, OTS, POV) and setup groups. Each camera is visible in the editor and in the VR walkthrough.</p>
          </div>
          <div class="feature">
            <span class="feature-icon">🎭</span>
            <h3>Full Production Blocking</h3>
            <p>Place cast marks, crew positions, equipment, and props. Assign names, roles, and setup groups with color-coded visual indicators.</p>
          </div>
          <div class="feature">
            <span class="feature-icon">🔢</span>
            <h3>Shot Sequencer</h3>
            <p>Click cameras in shooting order to assign shot numbers. Step through the sequence with animated orbital camera moves to review your entire shoot plan.</p>
          </div>
          <div class="feature">
            <span class="feature-icon">📄</span>
            <h3>Shot List PDF Export</h3>
            <p>Generate a production-ready shot list PDF with one click — shot numbers, types, labels, and setup groups formatted for your AD to hand off to the crew.</p>
            <span class="feature-badge">New</span>
          </div>
          <div class="feature">
            <span class="feature-icon">🥽</span>
            <h3>WebXR Preview</h3>
            <p>Walk the blocked scene in VR with a PICO headset before production day. No app install needed — runs directly in the browser over a local network.</p>
          </div>
        </div>
      </div>
    </section>

    <div class="divider"></div>

    <!-- CTA -->
    <section class="cta-section">
      <h2>Ready to block your first scene?</h2>
      <p>Pick a location, generate the splat, and start placing cameras in minutes.</p>
      <div class="hero-actions">
        <a href="/?mode=scout" class="btn-primary-lg">Start Scouting →</a>
        <a href="/?mode=editor" class="btn-ghost-lg">Jump to Editor</a>
      </div>
    </section>

    <!-- Footer -->
    <footer>
      <p>© 2026 Shot Caller · Production Blocking for Filmmakers</p>
      <div class="footer-links">
        <a href="/?mode=scout">Scout</a>
        <a href="/?mode=editor">Editor</a>
        <a href="/?mode=vr">VR Preview</a>
      </div>
    </footer>
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

// ---------------------------------------------------------------------------
// Scout shell — Google Maps location picker
// ---------------------------------------------------------------------------

export function renderScoutShell(): void {
  document.body.innerHTML = `
    <div id="app-root" style="width:100vw;height:100vh;background:#0d0f14;font-family:system-ui,sans-serif;display:flex;flex-direction:column;overflow:hidden;">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }

        #scout-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px;
          height: 52px;
          background: #0d0f14;
          border-bottom: 1px solid #1e2330;
          flex-shrink: 0;
          z-index: 10;
        }
        #scout-topbar h1 {
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: #f59e0b;
        }
        .scout-nav-link {
          color: #6b7280;
          font-size: 12px;
          text-decoration: none;
          padding: 6px 12px;
          border-radius: 6px;
          border: 1px solid #1e2330;
          transition: color 0.15s, border-color 0.15s;
        }
        .scout-nav-link:hover { color: #e5e7eb; border-color: #374151; }

        #scout-body {
          display: flex;
          flex: 1;
          overflow: hidden;
        }

        #scout-map-wrap {
          flex: 1;
          height: 100%;
          position: relative;
        }
        #scout-map {
          width: 100%;
          height: 100%;
        }
        #scout-search-input:focus {
          border-color: #f59e0b;
          box-shadow: 0 4px 16px rgba(0,0,0,0.6), 0 0 0 2px rgba(245,158,11,0.2);
        }

        #scout-sidebar {
          width: 360px;
          min-width: 360px;
          display: flex;
          flex-direction: column;
          background: #0d0f14;
          border-left: 1px solid #1e2330;
        }

        #scout-streetview {
          width: 100%;
          height: 240px;
          background: #111827;
          flex-shrink: 0;
        }

        #scout-info {
          padding: 16px;
          border-bottom: 1px solid #1e2330;
        }
        #scout-info-label {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: #4b5563;
          margin-bottom: 6px;
        }
        #scout-coords {
          font-size: 13px;
          color: #9ca3af;
          font-variant-numeric: tabular-nums;
        }
        #scout-hint {
          margin-top: 6px;
          font-size: 11px;
          color: #374151;
        }

        #scout-actions {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          flex: 1;
        }

        #scout-generate-btn {
          width: 100%;
          padding: 14px;
          border-radius: 10px;
          border: none;
          background: linear-gradient(135deg, #f59e0b, #ef4444);
          color: #111;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          letter-spacing: 0.5px;
          transition: opacity 0.15s;
        }
        #scout-generate-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        #scout-generate-btn:not(:disabled):hover { opacity: 0.88; }

        #scout-status {
          display: none;
          padding: 12px 14px;
          border-radius: 8px;
          font-size: 12px;
          line-height: 1.5;
          background: rgba(245,158,11,0.08);
          border: 1px solid rgba(245,158,11,0.2);
          color: #fbbf24;
        }
        #scout-status[data-type="error"] {
          background: rgba(239,68,68,0.08);
          border-color: rgba(239,68,68,0.25);
          color: #f87171;
        }
        #scout-status[data-type="done"] {
          background: rgba(16,185,129,0.08);
          border-color: rgba(16,185,129,0.25);
          color: #34d399;
        }

        #scout-done-panel {
          display: none;
          flex-direction: column;
          gap: 10px;
        }
        .scout-done-label {
          font-size: 12px;
          color: #34d399;
          font-weight: 600;
        }
        .scout-open-btn {
          display: block;
          text-align: center;
          padding: 13px;
          border-radius: 10px;
          background: #059669;
          color: #fff;
          font-size: 14px;
          font-weight: 700;
          text-decoration: none;
          transition: opacity 0.15s;
        }
        .scout-open-btn:hover { opacity: 0.88; }
        .scout-marble-link {
          display: block;
          text-align: center;
          font-size: 11px;
          color: #6b7280;
          text-decoration: none;
        }
        .scout-marble-link:hover { color: #9ca3af; }

        #scout-recent {
          padding: 0 16px 16px;
          border-top: 1px solid #1e2330;
          overflow-y: auto;
        }
        .scout-recent-title {
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: #374151;
          padding: 12px 0 8px;
        }
        .scout-recent-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #1e2330;
          font-size: 11px;
          color: #6b7280;
        }
        .scout-recent-item a {
          color: #f59e0b;
          text-decoration: none;
          font-size: 11px;
          font-weight: 600;
        }
        .scout-recent-item a:hover { color: #fbbf24; }

        #scout-error {
          display: none;
          margin: 16px;
          padding: 12px;
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.25);
          border-radius: 8px;
          color: #f87171;
          font-size: 12px;
        }
      </style>

      <div id="scout-topbar">
        <h1>Shot Caller — Location Scout</h1>
        <a class="scout-nav-link" href="/?mode=editor">Open Editor</a>
      </div>

      <div id="scout-body">
        <div id="scout-map-wrap" style="position:relative;flex:1;height:100%;">
          <div id="scout-map" style="width:100%;height:100%;"></div>
          <div id="scout-search-wrap" style="position:absolute;top:12px;left:50%;transform:translateX(-50%);z-index:5;width:min(480px,calc(100% - 32px));">
            <input id="scout-search-input" type="text" placeholder="Search address or location..."
              style="width:100%;padding:10px 14px;border-radius:8px;border:1px solid #374151;background:#111827;color:#f3f4f6;font-size:13px;outline:none;box-shadow:0 4px 16px rgba(0,0,0,0.5);" />
          </div>
        </div>

        <div id="scout-sidebar">
          <div id="scout-streetview"></div>

          <div id="scout-info">
            <div id="scout-info-label">Selected Location</div>
            <div id="scout-coords" style="color:#f59e0b;font-weight:600;">← Click the map to pick a location</div>
            <div id="scout-hint">Generate is locked until you click the map</div>
          </div>

          <div id="scout-actions">
            <button id="scout-generate-btn" disabled onclick="window.__scoutGenerate()">
              Generate Gaussian Splat
            </button>
            <div id="scout-status"></div>
            <div id="scout-done-panel"></div>
          </div>

          <div id="scout-recent">
            <div class="scout-recent-title">Recent Scenes</div>
            <div id="scout-recent-list"></div>
          </div>
        </div>
      </div>

      <div id="scout-error"></div>
    </div>
  `;
}
