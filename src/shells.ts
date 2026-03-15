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

export function renderHomeShell(): void {
  removeEditorStyle();
  document.body.className = "shot-caller-body-home";
  document.title = "Shot Caller — Generative Worlds for Film Pre-vis";
  document.body.innerHTML = `
    <div id="app-root" class="app-root-home">

      <!-- ── NAV ── -->
      <nav class="home-nav">
        <div class="home-nav-inner">
          <div class="home-nav-brand">
            <img src="./SensAI-logo.png" alt="SensAI" class="home-nav-logo" />
            <span class="home-nav-wordmark">Shot Caller</span>
          </div>
          <div class="home-nav-links">
            <a href="?mode=create" class="home-nav-link">Create</a>
            <a href="?mode=editor" class="home-nav-link">Editor</a>
            <a href="?mode=export&scene=demo" class="home-nav-link">Export</a>
            <a href="?mode=create" class="home-nav-cta-sm">Start Now</a>
          </div>
        </div>
      </nav>

      <!-- ── HERO ── -->
      <section class="home-hero">
        <div class="home-hero-inner">
          <p class="home-badge">Generative Pre-vis for Film</p>
          <h1 class="home-headline">
            Describe a location.<br/>
            <span class="home-headline-accent">Walk through it in VR.</span>
          </h1>
          <p class="home-subhead">
            Upload reference images and describe your scene in plain text.
            Shot Caller generates a photorealistic 3D world you can explore,
            block, and share — before you ever step on set.
          </p>
          <div class="home-hero-actions">
            <a href="?mode=create" class="home-btn-primary" id="hero-cta">
              <span class="home-btn-icon">✦</span> Create a World
            </a>
            <a href="?mode=editor" class="home-btn-secondary">Open Editor</a>
          </div>
        </div>
        <div class="home-hero-glow"></div>
      </section>

      <!-- ── HOW IT WORKS ── -->
      <section class="home-section">
        <div class="home-section-inner">
          <p class="home-section-kicker">How It Works</p>
          <h2 class="home-section-title">Four steps from concept to production report</h2>
          <div class="home-steps">
            <div class="home-step">
              <div class="home-step-num">01</div>
              <h3>Upload & Enhance</h3>
              <p>Drop in reference photos and describe your scene. Nano Banana enhances images for photorealistic quality.</p>
            </div>
            <div class="home-step">
              <div class="home-step-num">02</div>
              <h3>Generate 3D World</h3>
              <p>Our pipeline creates a Gaussian Splat — a photorealistic 3D environment built from your enhanced images and description.</p>
            </div>
            <div class="home-step">
              <div class="home-step-num">03</div>
              <h3>Enter VR & Block</h3>
              <p>Walk through the world on Meta Quest or desktop. Place cameras, actors, lights, and equipment. Build your shot list in 3D space.</p>
            </div>
            <div class="home-step">
              <div class="home-step-num">04</div>
              <h3>Export Report</h3>
              <p>Generate a professional pre-production report with screenshots, shot lists, and technical details ready for your team.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- ── FEATURES ── -->
      <section class="home-section home-section-alt">
        <div class="home-section-inner">
          <p class="home-section-kicker">Built for Filmmakers</p>
          <h2 class="home-section-title">Every tool a director needs, nothing they don't</h2>
          <div class="home-features">
            <div class="home-feature">
              <div class="home-feature-icon">🎥</div>
              <h4>Camera Placement</h4>
              <p>Place virtual cameras with real lens metadata — focal length, movement type, and director's notes.</p>
            </div>
            <div class="home-feature">
              <div class="home-feature-icon">🌐</div>
              <h4>Gaussian Splat Worlds</h4>
              <p>Photorealistic 3D environments generated from Street View, drone footage, or your own reference images.</p>
            </div>
            <div class="home-feature">
              <div class="home-feature-icon">🥽</div>
              <h4>WebXR Native</h4>
              <p>Preview directly on Meta Quest 3. No app installs, no sideloading — just open the link and walk in.</p>
            </div>
            <div class="home-feature">
              <div class="home-feature-icon">✕</div>
              <h4>Cast & Crew Blocking</h4>
              <p>Place actors, crew, equipment, and props in 3D space. Build the blocking before you build the set.</p>
            </div>
            <div class="home-feature">
              <div class="home-feature-icon">📋</div>
              <h4>Shot Sequencing</h4>
              <p>Click cameras in order to build a shot list. Review them in sequence with a single button.</p>
            </div>
            <div class="home-feature">
              <div class="home-feature-icon">🤖</div>
              <h4>AI-Enhanced Images</h4>
              <p>Nano Banana uses Gemini to enhance your input images, creating higher fidelity, more photorealistic results.</p>
            </div>
            <div class="home-feature">
              <div class="home-feature-icon">📄</div>
              <h4>Professional Reports</h4>
              <p>Export beautiful pre-production reports with screenshots, shot lists, and technical details for your team.</p>
            </div>
            <div class="home-feature">
              <div class="home-feature-icon">🔗</div>
              <h4>URL-Based Sharing</h4>
              <p>Share scenes instantly via URL — no file exports needed. Perfect for remote collaboration and client reviews.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- ── FINAL CTA ── -->
      <section class="home-section home-cta-section">
        <div class="home-section-inner" style="text-align:center">
          <h2 class="home-section-title">Ready to walk through your next scene?</h2>
          <p class="home-subhead" style="max-width:540px;margin:0 auto 2rem">
            No 3D experience required. Upload your references, describe your vision,
            and step into the world.
          </p>
          <a href="?mode=create" class="home-btn-primary home-btn-lg">
            <span class="home-btn-icon">✦</span> Create a World
          </a>
        </div>
      </section>

      <!-- ── FOOTER ── -->
      <footer class="home-footer">
        <div class="home-footer-inner">
          <span class="home-footer-brand">Shot Caller · SensAI</span>
          <span class="home-footer-muted">Generative worlds for film pre-visualization</span>
        </div>
      </footer>

    </div>
  `;
}

export function renderCreateShell(): void {
  removeEditorStyle();
  document.body.className = "shot-caller-body-create";
  document.title = "Create World — Shot Caller";
  document.body.innerHTML = `
    <div id="app-root" class="app-root-create">

      <!-- ── NAV ── -->
      <nav class="home-nav">
        <div class="home-nav-inner">
          <a href="?" class="home-nav-brand" style="text-decoration:none">
            <img src="./SensAI-logo.png" alt="SensAI" class="home-nav-logo" />
            <span class="home-nav-wordmark">Shot Caller</span>
          </a>
          <div class="home-nav-links">
            <a href="?" class="home-nav-link">Home</a>
            <a href="?mode=editor" class="home-nav-link">Editor</a>
          </div>
        </div>
      </nav>

      <!-- ── CREATE FORM ── -->
      <main class="create-main">
        <div class="create-container">

          <div class="create-header">
            <p class="home-badge">New World</p>
            <h1 class="create-title">Create your world</h1>
            <p class="create-subtitle">Upload reference images and describe your scene. We'll generate a 3D environment you can walk through in VR.</p>
          </div>

          <!-- Upload zone -->
          <div class="create-card">
            <div class="create-card-header">
              <span class="create-card-label">Reference Images</span>
              <span class="create-card-hint" id="create-file-count">No files selected</span>
            </div>
            <div class="create-dropzone" id="create-dropzone">
              <div class="create-dropzone-content">
                <div class="create-dropzone-icon">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <path d="m21 15-5-5L5 21"/>
                  </svg>
                </div>
                <p class="create-dropzone-text">Drop images here or <span class="create-dropzone-link">browse</span></p>
                <p class="create-dropzone-hint">PNG, JPG, or WebP · up to 20 images</p>
              </div>
              <input type="file" id="create-file-input" multiple accept="image/png,image/jpeg,image/webp" class="create-file-hidden" />
            </div>
            <div class="create-preview-grid" id="create-preview-grid"></div>
          </div>

          <!-- Text description -->
          <div class="create-card">
            <div class="create-card-header">
              <span class="create-card-label">Scene Description</span>
              <span class="create-card-hint">Plain English — be as specific as you like</span>
            </div>
            <textarea
              id="create-text-input"
              class="create-textarea"
              placeholder="Describe the scene you want to create…&#10;&#10;Example: A narrow cobblestone alley in Rome at golden hour. Warm light spills between terracotta buildings. A small café with outdoor seating sits at the end of the alley. Vespa parked against a wall."
              rows="6"
            ></textarea>
          </div>

          <!-- Nano Banana Settings -->
          <details class="create-settings">
            <summary class="create-settings-summary">
              <span class="create-settings-icon">🍌</span>
              <span class="create-settings-label">Nano Banana Settings</span>
              <span class="create-settings-hint">(Optional) Enhance images for better quality</span>
            </summary>
            <div class="create-settings-content">
              <p class="create-settings-description">
                Nano Banana uses Google's Gemini to enhance your images before generation,
                creating more photorealistic, high-fidelity results. Enter your Google API key below.
              </p>
              <div class="create-input-group">
                <label for="nano-banana-api-key" class="create-input-label">
                  Google API Key
                  <a href="https://aistudio.google.com/app/apikey" target="_blank" class="create-link">Get API key →</a>
                </label>
                <input
                  type="password"
                  id="nano-banana-api-key"
                  class="create-input"
                  placeholder="Enter your Google API key"
                />
                <button id="nano-banana-save-key" class="home-btn-secondary home-btn-sm">Save Key</button>
              </div>
              <p class="create-settings-note" id="nano-banana-status"></p>
            </div>
          </details>

          <!-- Generation status (hidden until generation starts) -->
          <div class="create-card create-status-card" id="create-status-card" style="display:none">
            <div class="create-status-row">
              <div class="create-spinner" id="create-spinner"></div>
              <div class="create-status-text">
                <p class="create-status-label" id="create-status-label">Generating world…</p>
                <p class="create-status-detail" id="create-status-detail">This may take a minute or two</p>
              </div>
            </div>
            <div class="create-progress-bar">
              <div class="create-progress-fill" id="create-progress-fill"></div>
            </div>
          </div>

          <!-- Error display -->
          <div class="create-error" id="create-error" style="display:none"></div>

          <!-- Actions -->
          <div class="create-actions">
            <button class="home-btn-primary home-btn-lg create-generate-btn" id="create-generate-btn" disabled>
              <span class="home-btn-icon">✦</span> Generate World
            </button>
          </div>

          <!-- Enter VR (hidden until world is ready) -->
          <div class="create-vr-section" id="create-vr-section" style="display:none">
            <div class="create-vr-card">
              <div class="create-vr-status">
                <div class="create-vr-check">✓</div>
                <div>
                  <p class="create-vr-ready">World ready</p>
                  <p class="create-vr-hint">Your 3D environment has been generated</p>
                </div>
              </div>
              <div class="create-vr-actions">
                <a class="home-btn-primary home-btn-lg create-enter-vr" id="create-enter-vr" href="#">
                  🥽 Enter VR
                </a>
                <a class="home-btn-secondary" id="create-open-editor" href="?mode=editor">
                  Open in Editor
                </a>
              </div>
            </div>
          </div>

        </div>
      </main>

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

export function renderExportShell(): void {
  removeEditorStyle();
  document.body.className = "shot-caller-body-export";
  document.title = "Export Report — Shot Caller";
  document.body.innerHTML = `
    <div id="app-root" class="app-root-export">

      <!-- ── NAV ── -->
      <nav class="home-nav">
        <div class="home-nav-inner">
          <a href="?" class="home-nav-brand" style="text-decoration:none">
            <img src="./SensAI-logo.png" alt="SensAI" class="home-nav-logo" />
            <span class="home-nav-wordmark">Shot Caller</span>
          </a>
          <div class="home-nav-links">
            <a href="?" class="home-nav-link">Home</a>
            <a href="?mode=editor" class="home-nav-link">Editor</a>
          </div>
        </div>
      </nav>

      <!-- ── EXPORT MAIN ── -->
      <main class="export-main">
        <div class="export-container">

          <div class="export-header">
            <p class="home-badge">Pre-Production</p>
            <h1 class="export-title">Export Report</h1>
            <p class="export-subtitle">Generate a professional pre-production report with screenshots and technical details</p>
          </div>

          <!-- Status -->
          <div class="export-status" id="export-status" style="display:none"></div>

          <!-- Progress -->
          <div class="export-progress" id="export-progress" style="display:none">
            <div class="export-progress-fill" id="export-progress-fill"></div>
          </div>

          <!-- Error -->
          <div class="export-error" id="export-error" style="display:none"></div>

          <!-- Actions -->
          <div class="export-actions">
            <button class="home-btn-primary home-btn-lg" id="export-generate-btn" disabled>
              <span class="home-btn-icon">✦</span> Generate Report
            </button>
            <button class="home-btn-secondary home-btn-lg" id="export-preview-btn" disabled>
              👁️ Preview
            </button>
            <button class="home-btn-secondary home-btn-lg" id="export-download-btn" disabled>
              ⬇️ Download HTML
            </button>
          </div>

          <!-- Preview Section -->
          <div class="export-preview-section" id="export-preview-section" style="display:none">
            <h2 class="export-preview-title">Report Preview</h2>
            <div class="export-preview-frame">
              <iframe id="export-preview-iframe" class="export-iframe"></iframe>
            </div>
          </div>

        </div>
      </main>

    </div>
  `;
}
