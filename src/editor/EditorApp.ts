import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import { SparkRenderer, SplatMesh } from "@sparkjsdev/spark";
import { AssetPlacer, type ToolType } from "./AssetPlacer.js";
import { SceneState } from "./SceneState.js";
import type { ProductionElement } from "./elements/ProductionElement.js";
import { CameraElement } from "./elements/CameraElement.js";
import { LightElement } from "./elements/LightElement.js";
import { CastMarkElement } from "./elements/CastMarkElement.js";
import { CrewElement } from "./elements/CrewElement.js";
import { EquipmentElement } from "./elements/EquipmentElement.js";
import { PropsElement } from "./elements/PropsElement.js";

class EditorApp {
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private controls!: OrbitControls;
  private transformControls!: TransformControls;
  private previewCamera!: THREE.PerspectiveCamera;
  private activePreviewEl: CameraElement | null = null;
  private gizmoMode: "translate" | "rotate" | "scale" = "translate";
  private sequenceMode = false;
  private nextShotNumber = 1;

  // Shot Review
  private reviewMode = false;
  private reviewShots: CameraElement[] = [];
  private reviewIndex = 0;
  private orbitTarget = new THREE.Vector3();    // lerp target for orbit controls
  private orbitLerping = false;

  private spark!: SparkRenderer;
  private splat: SplatMesh | null = null;
  private floor!: THREE.Mesh;
  private placer!: AssetPlacer;
  private state!: SceneState;

  private rafId = 0;

  // DOM elements
  private container!: HTMLElement;
  private sidebar!: HTMLElement;
  private statusBar!: HTMLElement;
  private loadingOverlay!: HTMLElement;
  private loadingText!: HTMLElement;
  private propertiesSection!: HTMLElement;
  private propertiesPanel!: HTMLElement;
  private keyboardHint!: HTMLElement;

  init(): void {
    this.container = document.getElementById("scene-container")!;
    this.sidebar = document.getElementById("editor-sidebar")!;
    this.statusBar = document.getElementById("status-bar")!;
    this.loadingOverlay = document.getElementById("loading-overlay")!;
    this.loadingText = document.getElementById("loading-text")!;
    this.propertiesSection = document.getElementById("properties-section")!;
    this.propertiesPanel = document.getElementById("properties-panel")!;
    this.keyboardHint = document.getElementById("keyboard-hint")!;

    this.sidebar.classList.add("visible");
    this.keyboardHint.classList.add("visible");

    this.initRenderer();
    this.initScene();
    this.initState();
    this.initPlacer();
    this.initUI();

    // Auto-load splat: ?spz= param takes priority, otherwise load default
    // Restore saved scene first so we get the saved splatUrl if any
    const restored = this.state.loadLocal();

    const DEFAULT_SPLAT = "./splats/sensai-lod.spz";
    const spzUrl =
      new URLSearchParams(window.location.search).get("spz") ??
      (restored ? this.state.getSplatUrl() : null) ??
      DEFAULT_SPLAT;
    (document.getElementById("spz-url-input") as HTMLInputElement).value = spzUrl;
    this.loadSplat(spzUrl);

    if (restored) {
      this.setStatus(`Scene restored — ${this.state.elements.size} element(s) loaded`);
    }

    window.addEventListener("resize", this.onResize);
    this.animate();
  }

  // ── Renderer + Scene setup ─────────────────────────────────────────────────

  private initRenderer(): void {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.shadowMap.enabled = false;
    this.container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(
      55,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      500
    );
    this.camera.position.set(0, 6, 12);
    this.camera.lookAt(0, 0, 0);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.minDistance = 1;
    this.controls.maxDistance = 80;
    this.controls.target.set(0, 0, 0);

    this.previewCamera = new THREE.PerspectiveCamera(55, 16 / 9, 0.1, 500);

    this.transformControls = new TransformControls(this.camera, this.renderer.domElement);
    this.transformControls.setMode("translate");
    this.transformControls.setSize(0.8);
    // Disable orbit while dragging gizmo handles
    this.transformControls.addEventListener("dragging-changed", (e) => {
      this.controls.enabled = !e.value;
      this.placer.gizmoActive = Boolean(e.value);
    });
  }

  private initScene(): void {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0020);

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dir = new THREE.DirectionalLight(0xffffff, 0.6);
    dir.position.set(8, 14, 6);
    this.scene.add(dir);

    // SparkJS renderer for Gaussian splats — LoD on for sensai-lod.spz
    this.spark = new SparkRenderer({
      renderer: this.renderer,
      enableLod: true,
      lodSplatScale: 1.0,
    });
    this.spark.renderOrder = -10;
    this.scene.add(this.spark);

    // Invisible floor for raycasting (placed elements snap to this)
    const floorGeo = new THREE.PlaneGeometry(200, 200);
    floorGeo.rotateX(-Math.PI / 2);
    this.floor = new THREE.Mesh(
      floorGeo,
      new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide })
    );
    this.floor.name = "floor";
    this.scene.add(this.floor);

    // Grid helper (subtle)
    const grid = new THREE.GridHelper(60, 60, 0x2d1a4a, 0x1a0d33);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.5;
    this.scene.add(grid);

    // TransformControls added after initRenderer so this.transformControls exists
    // It will be added to scene in initPlacer after both are ready
  }

  private initState(): void {
    this.state = new SceneState(this.scene);
  }

  private initPlacer(): void {
    this.placer = new AssetPlacer(
      this.scene,
      this.camera,
      this.floor,
      this.controls,
      this.state
    );
    this.placer.attach(this.renderer.domElement);

    this.placer.onSelect = (el) => this.onElementSelected(el);
    this.placer.onPlace = (el) => console.log("[Editor] Placed:", el.name);
    this.placer.onDelete = (_el) => this.onElementSelected(null);
    this.placer.onStatusChange = (msg) => this.setStatus(msg);

    // Add TransformControls to scene now that both scene and placer exist
    this.scene.add(this.transformControls.getHelper());
  }

  // ── UI wiring ──────────────────────────────────────────────────────────────

  private initUI(): void {
    // Tool buttons
    document.querySelectorAll<HTMLButtonElement>(".tool-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const tool = btn.dataset.tool as ToolType;
        document.querySelectorAll(".tool-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        if (tool === "select") {
          this.placer.cancelTool();
          this.container.classList.remove("placing");
        } else {
          this.placer.setTool(tool);
          this.container.classList.add("placing");
        }
      });
    });

    // Load splat
    document.getElementById("load-splat-btn")!.addEventListener("click", () => {
      const url = (document.getElementById("spz-url-input") as HTMLInputElement).value.trim();
      if (url) this.loadSplat(url);
    });
    document.getElementById("spz-url-input")!.addEventListener("keydown", (e) => {
      if ((e as KeyboardEvent).key === "Enter") {
        const url = (document.getElementById("spz-url-input") as HTMLInputElement).value.trim();
        if (url) this.loadSplat(url);
      }
    });

    // Save / Export
    document.getElementById("save-scene-btn")!.addEventListener("click", () => {
      this.state.saveToKV();
      this.setStatus(`Scene saved`);
    });
    document.getElementById("preview-vr-btn")!.addEventListener("click", () => {
      this.state.saveToKV();
      window.location.href = `/?mode=stage4-xr&scene=${this.state.id}`;
    });
    document.getElementById("export-json-btn")!.addEventListener("click", () => {
      this.state.exportJSON();
    });

    // Delete selected
    document.getElementById("delete-element-btn")!.addEventListener("click", () => {
      const el = this.placer.selected;
      if (el) {
        this.placer.selectElement(null);
        this.state.removeElement(el);
        this.setStatus(`Deleted ${el.name}`);
      }
    });

    // Gizmo mode buttons
    document.querySelectorAll<HTMLButtonElement>(".gizmo-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.setGizmoMode(btn.dataset.gizmo as "translate" | "rotate" | "scale");
      });
    });

    // Sequence mode
    document.getElementById("sequence-mode-btn")!.addEventListener("click", () => {
      this.toggleSequenceMode();
    });
    document.getElementById("sequence-reset-btn")!.addEventListener("click", () => {
      this.resetSequence();
    });

    // Shot review
    document.getElementById("review-mode-btn")!.addEventListener("click", () => {
      this.reviewMode ? this.exitReviewMode() : this.enterReviewMode();
    });
    document.getElementById("shot-prev-btn")!.addEventListener("click", () => this.stepReview(-1));
    document.getElementById("shot-next-btn")!.addEventListener("click", () => this.stepReview(1));
    document.getElementById("shot-review-exit")!.addEventListener("click", () => this.exitReviewMode());

    // Keyboard shortcuts
    window.addEventListener("keydown", (e) => {
      if (e.target instanceof HTMLInputElement) return; // don't steal input focus

      // Arrow keys step through shots in review mode
      if (this.reviewMode) {
        if (e.key === "ArrowRight" || e.key === "ArrowDown") { this.stepReview(1); return; }
        if (e.key === "ArrowLeft"  || e.key === "ArrowUp")   { this.stepReview(-1); return; }
        if (e.key === "Escape") { this.exitReviewMode(); return; }
      }

      // W/E/R = gizmo mode (Unity-style), only when an element is selected
      if (e.key === "w" || e.key === "W") { this.setGizmoMode("translate"); return; }
      if (e.key === "e" || e.key === "E") { this.setGizmoMode("rotate"); return; }
      if (e.key === "r" || e.key === "R") { this.setGizmoMode("scale"); return; }

      // Escape: cancel placement tool
      if (e.key === "Escape" && this.placer.currentTool !== "select") {
        document.querySelectorAll(".tool-btn").forEach((b) => b.classList.remove("active"));
        document.querySelector('.tool-btn[data-tool="select"]')?.classList.add("active");
        this.container.classList.remove("placing");
      }
    });
  }

  // ── Properties panel ───────────────────────────────────────────────────────

  private toggleSequenceMode(): void {
    this.sequenceMode = !this.sequenceMode;
    const btn = document.getElementById("sequence-mode-btn")!;
    const hint = document.getElementById("sequence-hint")!;
    if (this.sequenceMode) {
      btn.classList.add("active");
      hint.style.display = "block";
      this.placer.cancelTool();
      this.setStatus("Sequence Mode — click cameras in order to assign shot numbers");
    } else {
      btn.classList.remove("active");
      hint.style.display = "none";
      this.setStatus("Ready");
    }
  }

  private resetSequence(): void {
    this.nextShotNumber = 1;
    for (const el of this.state.elements.values()) {
      if (el instanceof CameraElement) el.setShotNumber(null);
    }
    this.setStatus("Shot sequence cleared");
  }

  private setGizmoMode(mode: "translate" | "rotate" | "scale"): void {
    this.gizmoMode = mode;
    this.transformControls.setMode(mode);
    document.querySelectorAll(".gizmo-btn").forEach((b) => b.classList.remove("active"));
    document.querySelector(`.gizmo-btn[data-gizmo="${mode}"]`)?.classList.add("active");
  }

  private onElementSelected(el: ProductionElement | null): void {
    this.placer.hasSelection = el !== null;

    if (!el) {
      this.propertiesSection.classList.remove("visible");
      this.transformControls.detach();
      return;
    }

    // Sequence mode: clicking a camera assigns the next shot number
    if (this.sequenceMode && el instanceof CameraElement) {
      el.setShotNumber(this.nextShotNumber++);
      this.setStatus(`Shot ${el.shotNumber} assigned to ${el.name}`);
    }

    this.transformControls.attach(el.group);
    this.transformControls.setMode(this.gizmoMode);

    // Show camera preview when a camera is selected
    this.setActivePreview(el instanceof CameraElement ? el : null);

    this.propertiesSection.classList.add("visible");
    this.propertiesPanel.innerHTML = this.buildPropsHTML(el);

    // Wire up property inputs
    this.propertiesPanel.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
      "[data-prop]"
    ).forEach((input) => {
      const prop = input.dataset.prop!;

      const update = () => {
        if (prop === "name") {
          el.name = (input as HTMLInputElement).value;
          el.setProperty("name", el.name);
        } else {
          const val =
            input.type === "range" || input.type === "number"
              ? parseFloat((input as HTMLInputElement).value)
              : (input as HTMLInputElement | HTMLSelectElement).value;
          el.setProperty(prop, val);

          // Update the live value label for ranges
          if (input.type === "range") {
            const label = input.previousElementSibling;
            if (label) {
              const valueSpan = label.querySelector(".prop-value");
              if (valueSpan) {
                const suffix = prop === "focalLength" ? "mm" : prop === "colorTemp" ? "K" : prop === "coneAngle" ? "°" : "m";
                valueSpan.textContent = `${(input as HTMLInputElement).value}${suffix}`;
              }
            }
          }
        }
      };

      input.addEventListener("input", update);
      input.addEventListener("change", update);
    });
  }

  // ── Camera Preview ─────────────────────────────────────────────────────────

  private setActivePreview(el: CameraElement | null): void {
    this.activePreviewEl = el;
    const overlay = document.getElementById("camera-preview-overlay")!;
    if (el) {
      overlay.style.display = "block";
      this.updatePreviewLabel(el);
    } else {
      overlay.style.display = "none";
    }
  }

  private updatePreviewLabel(el: CameraElement): void {
    const label = el.shotNumber !== null
      ? `Shot ${el.shotNumber}${el.shotType ? " · " + el.shotType : ""}`
      : el.name;
    document.getElementById("preview-label")!.textContent = label;
  }

  private syncPreviewCamera(el: CameraElement): void {
    // Match FOV and aspect ratio to the camera element's properties
    this.previewCamera.fov = el.vFovDeg;
    this.previewCamera.aspect = el.aspectRatio;
    this.previewCamera.updateProjectionMatrix();

    // Position at the camera element's world position (raised to lens height)
    const worldPos = new THREE.Vector3();
    el.group.getWorldPosition(worldPos);
    worldPos.y += 0.09;
    this.previewCamera.position.copy(worldPos);

    // Face in the camera element's -Z direction (its forward)
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(el.group.quaternion);
    this.previewCamera.lookAt(worldPos.clone().add(forward));
  }

  // ── Shot Review ────────────────────────────────────────────────────────────

  enterReviewMode(): void {
    // Collect sequenced cameras sorted by shot number
    this.reviewShots = [...this.state.elements.values()]
      .filter((el): el is CameraElement => el instanceof CameraElement && el.shotNumber !== null)
      .sort((a, b) => a.shotNumber! - b.shotNumber!);

    if (this.reviewShots.length === 0) {
      this.setStatus("No sequenced shots — assign shot numbers in Sequence Mode first");
      return;
    }

    this.reviewMode = true;
    this.reviewIndex = 0;
    this.placer.cancelTool();
    this.transformControls.detach();
    this.propertiesSection.classList.remove("visible");

    document.getElementById("shot-review-panel")!.style.display = "flex";
    document.getElementById("review-mode-btn")!.classList.add("active");
    (document.getElementById("sequence-mode-btn") as HTMLButtonElement).disabled = true;

    this.applyReviewFrame();
  }

  exitReviewMode(): void {
    this.reviewMode = false;
    document.getElementById("shot-review-panel")!.style.display = "none";
    document.getElementById("review-mode-btn")!.classList.remove("active");
    (document.getElementById("sequence-mode-btn") as HTMLButtonElement).disabled = false;

    // Restore all elements to full opacity
    for (const el of this.state.elements.values()) {
      el.setDimmed(false);
      if (el instanceof CameraElement) el.setReviewActive(false);
    }
    this.setActivePreview(null);
    this.setStatus("Ready");
  }

  private applyReviewFrame(): void {
    const cam = this.reviewShots[this.reviewIndex];
    const total = this.reviewShots.length;

    // Dim everything, highlight active camera
    for (const el of this.state.elements.values()) {
      if (el === cam) {
        el.setDimmed(false);
        cam.setReviewActive(true);
      } else if (el instanceof CameraElement) {
        el.setDimmed(true);
        el.setReviewActive(false);
      } else {
        // Non-camera elements: show if in same setup group, else dim
        const sameGroup = cam.setupGroup !== "" && (el.getProperties() as Record<string, unknown>)["setupGroup"] === cam.setupGroup;
        el.setDimmed(!sameGroup);
      }
    }

    // Orbit camera to frame the active shot camera
    this.orbitTarget.copy(cam.group.position);
    this.orbitLerping = true;

    // Update overlay
    const typeLabel = cam.shotType ? ` · ${cam.shotType}` : "";
    const groupLabel = cam.setupGroup ? ` · Setup ${cam.setupGroup}` : "";
    document.getElementById("shot-review-number")!.textContent = `Shot ${cam.shotNumber} of ${total}`;
    document.getElementById("shot-review-type")!.textContent = `${cam.shotType || "—"}${groupLabel}`;
    document.getElementById("shot-review-label")!.textContent = cam.shotLabel || cam.name;
    document.getElementById("shot-prev-btn")!.toggleAttribute("disabled", this.reviewIndex === 0);
    document.getElementById("shot-next-btn")!.toggleAttribute("disabled", this.reviewIndex === total - 1);

    this.setActivePreview(cam);
    this.setStatus(`Reviewing: Shot ${cam.shotNumber}${typeLabel}${groupLabel} — ${cam.name}`);
  }

  stepReview(dir: 1 | -1): void {
    const next = this.reviewIndex + dir;
    if (next < 0 || next >= this.reviewShots.length) return;
    this.reviewIndex = next;
    this.applyReviewFrame();
  }

  private buildPropsHTML(el: ProductionElement): string {
    if (el instanceof CameraElement) return CameraElement.buildPropertiesHTML(el);
    if (el instanceof LightElement) return LightElement.buildPropertiesHTML(el);
    if (el instanceof CastMarkElement) return CastMarkElement.buildPropertiesHTML(el);
    if (el instanceof CrewElement) return CrewElement.buildPropertiesHTML(el);
    if (el instanceof EquipmentElement) return EquipmentElement.buildPropertiesHTML(el);
    if (el instanceof PropsElement) return PropsElement.buildPropertiesHTML(el);
    return `<p style="color:#6b5a8a;font-size:10px">No properties</p>`;
  }

  // ── Splat / Panorama loading ──────────────────────────────────────────────

  private isImageUrl(url: string): boolean {
    return /\.(jpe?g|png|webp)$/i.test(url.split("?")[0]);
  }

  async loadSplat(url: string): Promise<void> {
    // Normalize bare filenames to the splats directory
    if (!url.includes("/") && (url.endsWith(".spz") || url.endsWith(".ply"))) {
      url = `./splats/${url}`;
    }
    this.showLoading(`Loading scene…`);
    this.state.setSplatUrl(url);

    try {
      // Remove existing splat
      if (this.splat) {
        this.scene.remove(this.splat);
        this.splat.dispose();
        this.splat = null;
      }

      // Reset background when loading a new scene
      this.scene.background = new THREE.Color(0x0a0020);
      this.scene.environment = null;

      if (this.isImageUrl(url)) {
        // Load equirectangular panorama as scene background
        await this.loadPanorama(url);
      } else {
        // Load Gaussian splat (.spz)
        const isLod = url.includes("-lod.");
        const splat = new SplatMesh({ url, lod: isLod || undefined });
        await splat.initialized;
        splat.renderOrder = -10;

        // World Labs generated splats use OpenCV coords (Y-down, Z-into-screen)
        // Flip to OpenGL/Three.js (Y-up, Z-out) by rotating 180° around X
        const isWorldLabs = !url.includes("sensai");
        if (isWorldLabs) {
          splat.rotation.x = Math.PI;
          splat.position.y = 2.887;
        }

        this.scene.add(splat);
        this.splat = splat;
      }

      this.setStatus(`Scene loaded — start placing elements`);
      console.log("[Editor] Loaded scene:", url);
    } catch (err) {
      console.error("[Editor] Failed to load scene:", err);
      this.setStatus(`Failed to load scene — check the URL`);
    } finally {
      this.hideLoading();
    }
  }

  private loadPanorama(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const loader = new THREE.TextureLoader();
      loader.load(
        url,
        (texture) => {
          texture.mapping = THREE.EquirectangularReflectionMapping;
          texture.colorSpace = THREE.SRGBColorSpace;
          this.scene.background = texture;
          this.scene.environment = texture;
          console.log("[Editor] Loaded panorama:", url);
          resolve();
        },
        undefined,
        (err) => reject(err)
      );
    });
  }

  // ── Loading overlay ────────────────────────────────────────────────────────

  showLoading(msg: string): void {
    this.loadingText.textContent = msg;
    this.loadingOverlay.classList.add("visible");
  }

  hideLoading(): void {
    this.loadingOverlay.classList.remove("visible");
  }

  setStatus(msg: string): void {
    this.statusBar.textContent = msg;
  }

  // ── Render loop ────────────────────────────────────────────────────────────

  private animate = (): void => {
    this.rafId = requestAnimationFrame(this.animate);

    if (this.orbitLerping) {
      this.controls.target.lerp(this.orbitTarget, 0.08);
      if (this.controls.target.distanceTo(this.orbitTarget) < 0.01) {
        this.controls.target.copy(this.orbitTarget);
        this.orbitLerping = false;
      }
    }
    this.controls.update();

    // Main render (full canvas)
    this.renderer.setScissorTest(false);
    this.renderer.autoClear = true;
    this.renderer.setViewport(0, 0, this.container.clientWidth, this.container.clientHeight);
    this.renderer.render(this.scene, this.camera);

    // Picture-in-picture preview from active camera
    if (this.activePreviewEl) {
      this.syncPreviewCamera(this.activePreviewEl);
      this.renderPreview();
      this.updatePreviewLabel(this.activePreviewEl);
    }
  };

  private renderPreview(): void {
    // Hide the camera element's own mesh so it doesn't occlude its own preview
    if (this.activePreviewEl) this.activePreviewEl.group.visible = false;
    const cw = this.container.clientWidth;
    const ch = this.container.clientHeight;

    // Preview size in CSS pixels — Three.js applies DPR internally
    const pw = Math.min(280, cw * 0.28);
    const ph = pw / (this.previewCamera.aspect || (16 / 9));
    const margin = 12;

    // setViewport / setScissor use bottom-left origin (WebGL convention)
    const px = cw - pw - margin;          // left edge
    const glY = ch - margin - ph;         // bottom edge (from canvas bottom)

    const prevAutoClear = this.renderer.autoClear;
    this.renderer.autoClear = false;

    this.renderer.setScissorTest(true);
    this.renderer.setScissor(px, glY, pw, ph);
    this.renderer.setViewport(px, glY, pw, ph);
    this.renderer.setClearColor(0x04010e, 1);
    this.renderer.clear(true, true, false);
    this.renderer.render(this.scene, this.previewCamera);

    this.renderer.setScissorTest(false);
    this.renderer.autoClear = prevAutoClear;
    this.renderer.setViewport(0, 0, cw, ch);

    // Restore camera mesh visibility
    if (this.activePreviewEl) this.activePreviewEl.group.visible = true;
  }

  private onResize = (): void => {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  };

  dispose(): void {
    cancelAnimationFrame(this.rafId);
    window.removeEventListener("resize", this.onResize);
    this.placer.detach(this.renderer.domElement);
    this.renderer.dispose();
  }
}

/** Entry point called from index.ts when XR is not available */
export function startEditor(): void {
  const app = new EditorApp();
  app.init();
  // Expose for debugging during hackathon
  (window as unknown as Record<string, unknown>).__shotCallerEditor = app;
}
