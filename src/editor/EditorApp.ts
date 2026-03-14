import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { SparkRenderer, SplatMesh } from "@sparkjsdev/spark";
import { AssetPlacer, type ToolType } from "./AssetPlacer.js";
import { SceneState } from "./SceneState.js";
import type { ProductionElement } from "./elements/ProductionElement.js";
import { CameraElement } from "./elements/CameraElement.js";
import { LightElement } from "./elements/LightElement.js";
import { CastMarkElement } from "./elements/CastMarkElement.js";
import { CrewElement } from "./elements/CrewElement.js";
import { EquipmentElement } from "./elements/EquipmentElement.js";

class EditorApp {
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private controls!: OrbitControls;
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
    const DEFAULT_SPLAT = "./splats/sensai-lod.spz";
    const spzUrl =
      new URLSearchParams(window.location.search).get("spz") ?? DEFAULT_SPLAT;
    (document.getElementById("spz-url-input") as HTMLInputElement).value = spzUrl;
    this.loadSplat(spzUrl);

    // Try to restore saved scene
    const restored = this.state.loadLocal();
    if (restored) {
      this.setStatus(`Restored scene ${this.state.id}`);
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
      this.setStatus(`Scene ${this.state.id} saved`);
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

    // When Escape pressed while tool active, reset tool button to Select
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.placer.currentTool !== "select") {
        document.querySelectorAll(".tool-btn").forEach((b) => b.classList.remove("active"));
        document.querySelector('.tool-btn[data-tool="select"]')?.classList.add("active");
        this.container.classList.remove("placing");
      }
    });
  }

  // ── Properties panel ───────────────────────────────────────────────────────

  private onElementSelected(el: ProductionElement | null): void {
    if (!el) {
      this.propertiesSection.classList.remove("visible");
      return;
    }

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

  private buildPropsHTML(el: ProductionElement): string {
    if (el instanceof CameraElement) return CameraElement.buildPropertiesHTML(el);
    if (el instanceof LightElement) return LightElement.buildPropertiesHTML(el);
    if (el instanceof CastMarkElement) return CastMarkElement.buildPropertiesHTML(el);
    if (el instanceof CrewElement) return CrewElement.buildPropertiesHTML(el);
    if (el instanceof EquipmentElement) return EquipmentElement.buildPropertiesHTML(el);
    return `<p style="color:#6b5a8a;font-size:10px">No properties</p>`;
  }

  // ── Splat loading ──────────────────────────────────────────────────────────

  async loadSplat(url: string): Promise<void> {
    this.showLoading(`Loading scene…`);
    this.state.setSplatUrl(url);

    try {
      if (this.splat) {
        this.scene.remove(this.splat);
        this.splat.dispose();
        this.splat = null;
      }

      const isLod = url.includes("-lod.");
      const splat = new SplatMesh({ url, lod: isLod || undefined });
      await splat.initialized;
      splat.renderOrder = -10;
      this.scene.add(splat);
      this.splat = splat;

      this.setStatus(`Scene loaded — start placing elements`);
      console.log("[Editor] Loaded splat:", url);
    } catch (err) {
      console.error("[Editor] Failed to load splat:", err);
      this.setStatus(`Failed to load scene — check the URL`);
    } finally {
      this.hideLoading();
    }
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
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

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
