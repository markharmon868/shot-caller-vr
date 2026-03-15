const EDITOR_STYLE_ID = "shot-caller-editor-shell-style";

const editorStyles = `
  /* Editor shell uses design-system.css layout grid */
  body.shot-caller-body-editor {
    background: var(--bg);
    color: var(--text-1);
    overflow: hidden;
  }


  /* Canvas wrapper */
  #canvas-wrapper {
    position: relative;
    background: #000;
    overflow: hidden;
  }

  #canvas-wrapper canvas {
    display: block;
    width: 100% !important;
    height: 100% !important;
  }

  #canvas-wrapper.placing { cursor: crosshair; }

  /* Loading overlay */
  #loading-overlay {
    display: none;
    position: absolute;
    inset: 0;
    background: rgba(10, 10, 10, 0.9);
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: var(--sp-4);
    z-index: var(--z-overlay);
  }

  #loading-overlay.visible { display: flex; }
  #loading-text { color: var(--text-2); font-size: var(--text-sm); }

  #loading-spinner {
    width: 36px;
    height: 36px;
    border: 3px solid var(--border);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: shot-caller-spin 0.75s linear infinite;
  }

  @keyframes shot-caller-spin { to { transform: rotate(360deg); } }

  /* Keyboard hint overlay */
  #keyboard-hint {
    position: absolute;
    bottom: var(--sp-4);
    right: var(--sp-4);
    background: rgba(10, 10, 10, 0.85);
    backdrop-filter: blur(8px);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-base);
    padding: var(--sp-2) var(--sp-3);
    color: var(--text-3);
    font-size: var(--text-xs);
    line-height: var(--lh-base);
    display: none;
    pointer-events: none;
  }

  #keyboard-hint.visible { display: block; }

  /* Bottombar */
  #bottombar {
    display: flex;
    align-items: center;
    gap: var(--sp-4);
    padding: 0 var(--sp-4);
    background: var(--bg);
    border-top: 1px solid var(--border-subtle);
    font: 400 var(--text-xs)/1 var(--font-mono);
    color: var(--text-4);
  }

  .status-item {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
  }

  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--accent);
  }
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
      <!-- TOPBAR -->
      <div id="topbar">
        <a href="?" class="topbar-logo">SHOT <span class="accent">CALLER</span></a>
        <div class="topbar-divider"></div>
        <input type="text" class="scene-title" value="Untitled Scene" id="scene-title-input" />
        <div class="topbar-spacer"></div>
        <button class="mode-btn active" data-mode="edit">EDIT</button>
        <button class="mode-btn" data-mode="sequence">SEQUENCE</button>
        <button class="mode-btn" data-mode="review">REVIEW</button>
      </div>

      <!-- LEFT PANEL -->
      <div id="left-panel" class="panel">
        <!-- Scene -->
        <div class="panel-section">
          <div class="section-label">Scene</div>
          <input id="spz-url-input" type="text" placeholder=".spz or image URL" style="width: 100%; padding: 6px 8px; background: var(--bg-raised); border: 1px solid var(--border-subtle); border-radius: var(--radius-base); color: var(--text-1); font-size: var(--text-sm); outline: none; margin-bottom: 8px;" />
          <button id="load-splat-btn" class="btn" style="width: 100%;">Load Scene</button>
        </div>

        <!-- Elements -->
        <div class="panel-section">
          <div class="section-label">Elements</div>
          <div class="element-grid">
            <button class="element-btn active" data-tool="select">
              <span class="element-icon">↖</span>
              <span class="element-name">SELECT</span>
            </button>
            <button class="element-btn" data-tool="camera">
              <span class="element-icon">🎥</span>
              <span class="element-name">CAMERA</span>
            </button>
            <button class="element-btn" data-tool="light">
              <span class="element-icon">💡</span>
              <span class="element-name">LIGHT</span>
            </button>
            <button class="element-btn" data-tool="cast_mark">
              <span class="element-icon">✕</span>
              <span class="element-name">ACTOR</span>
            </button>
            <button class="element-btn" data-tool="crew">
              <span class="element-icon">🚶</span>
              <span class="element-name">CREW</span>
            </button>
            <button class="element-btn" data-tool="equipment">
              <span class="element-icon">🎬</span>
              <span class="element-name">EQUIP</span>
            </button>
            <button class="element-btn" data-tool="props">
              <span class="element-icon">📦</span>
              <span class="element-name">PROPS</span>
            </button>
            <button class="element-btn" data-tool="gltf">
              <span class="element-icon">📐</span>
              <span class="element-name">MODEL</span>
            </button>
          </div>
        </div>

        <!-- Transform -->
        <div class="panel-section">
          <div class="section-label">Transform <span style="color: var(--text-4); font-weight: 400;">W / E / R</span></div>
          <div class="gizmo-row">
            <button class="gizmo-btn active" data-gizmo="translate">MOVE</button>
            <button class="gizmo-btn" data-gizmo="rotate">ROTATE</button>
            <button class="gizmo-btn" data-gizmo="scale">SCALE</button>
          </div>
        </div>
      </div>

      <!-- CANVAS WRAPPER -->
      <div id="canvas-wrapper">
        <div id="loading-overlay">
          <div id="loading-spinner"></div>
          <p id="loading-text">Loading scene…</p>
        </div>
        <div id="keyboard-hint">
          Orbit: left drag · Pan: right drag · Zoom: scroll<br>
          W = Move · E = Rotate · R = Scale · Del = Delete
        </div>
      </div>

      <!-- RIGHT PANEL -->
      <div id="right-panel" class="panel">
        <!-- Properties (shown when element selected) -->
        <div class="panel-section" id="properties-section" style="display: none;">
          <div class="section-label">Properties</div>
          <div id="properties-panel"></div>
          <button id="delete-element-btn" class="btn" style="width: 100%; margin-top: 8px; border-color: var(--color-error); color: var(--color-error);">Delete</button>
        </div>

        <!-- Shot List -->
        <div class="panel-section">
          <div class="section-label">Shot List</div>
          <div id="shot-list-container" style="font: 400 var(--text-xs)/var(--lh-base) var(--font-mono); color: var(--text-3);">
            No cameras placed yet
          </div>
        </div>

        <!-- Actions -->
        <div class="panel-section" style="margin-top: auto;">
          <div class="section-label">Actions</div>
          <button id="save-scene-btn" class="btn" style="width: 100%; background: var(--accent-dim); border-color: var(--accent); color: var(--accent); margin-bottom: 6px;">Save Scene</button>
          <button id="preview-vr-btn" class="btn" style="width: 100%; margin-bottom: 6px;">Preview in VR</button>
          <button id="export-json-btn" class="btn" style="width: 100%;">Export JSON</button>
        </div>
      </div>

      <!-- BOTTOMBAR -->
      <div id="bottombar">
        <div class="status-item">
          <div class="status-dot"></div>
          <span id="status-text">Ready</span>
        </div>
        <div class="topbar-spacer"></div>
        <span id="element-count">0 elements</span>
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
