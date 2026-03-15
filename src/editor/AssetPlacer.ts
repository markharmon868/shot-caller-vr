import * as THREE from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { ProductionElement } from "./elements/ProductionElement.js";
import { createElement } from "./SceneState.js";
import type { SceneState } from "./SceneState.js";

export type ToolType = "select" | "camera" | "light" | "cast_mark" | "crew" | "equipment";

/**
 * Handles all mouse-based interaction with the 3D viewport:
 * - Ghost preview element follows the cursor when a placement tool is active
 * - Click to confirm placement on the floor plane
 * - Click to select existing elements
 * - Drag selected element to reposition it on the floor plane
 * - Delete key to remove selected element
 */
export class AssetPlacer {
  private activeTool: ToolType = "select";
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2(-999, -999);

  private ghost: ProductionElement | null = null;
  private selectedElement: ProductionElement | null = null;

  private isDragging = false;
  private dragStart = new THREE.Vector3();

  /** Set to true while TransformControls is dragging so AssetPlacer doesn't also move the element */
  gizmoActive = false;

  // Callbacks for the EditorApp to respond to selection changes
  onSelect?: (el: ProductionElement | null) => void;
  onPlace?: (el: ProductionElement) => void;
  onDelete?: (el: ProductionElement) => void;
  onStatusChange?: (msg: string) => void;

  constructor(
    private scene: THREE.Scene,
    private camera: THREE.PerspectiveCamera,
    private floor: THREE.Mesh,
    private orbitControls: OrbitControls,
    private state: SceneState
  ) {}

  get currentTool(): ToolType { return this.activeTool; }
  get selected(): ProductionElement | null { return this.selectedElement; }

  // ── Tool activation ────────────────────────────────────────────────────────

  setTool(type: ToolType): void {
    this.clearGhost();
    this.activeTool = type;

    if (type !== "select") {
      this.orbitControls.enabled = false;
      this.ghost = createElement(type);
      this.makeGhostTransparent(this.ghost);
      this.scene.add(this.ghost.group);
      this.ghost.group.visible = false;
      this.onStatusChange?.(`Click in the viewport to place a ${type.replace("_", " ")}`);
    } else {
      this.orbitControls.enabled = true;
      this.onStatusChange?.("Click an element to select it. Drag to reposition.");
    }
  }

  cancelTool(): void {
    this.clearGhost();
    this.activeTool = "select";
    this.orbitControls.enabled = true;
    this.onStatusChange?.("Ready");
  }

  // ── DOM event attachment ───────────────────────────────────────────────────

  attach(canvas: HTMLCanvasElement): void {
    canvas.addEventListener("mousemove", this.onMouseMove);
    canvas.addEventListener("mousedown", this.onMouseDown);
    canvas.addEventListener("mouseup", this.onMouseUp);
    canvas.addEventListener("click", this.onClick);
    window.addEventListener("keydown", this.onKeyDown);
  }

  detach(canvas: HTMLCanvasElement): void {
    canvas.removeEventListener("mousemove", this.onMouseMove);
    canvas.removeEventListener("mousedown", this.onMouseDown);
    canvas.removeEventListener("mouseup", this.onMouseUp);
    canvas.removeEventListener("click", this.onClick);
    window.removeEventListener("keydown", this.onKeyDown);
  }

  // ── Event handlers ─────────────────────────────────────────────────────────

  private onMouseMove = (e: MouseEvent): void => {
    this.updatePointer(e);

    if (this.isDragging && this.selectedElement) {
      const hit = this.raycastFloor();
      if (hit) {
        this.selectedElement.setPosition(hit.x, 0, hit.z);
      }
      return;
    }

    if (this.activeTool !== "select" && this.ghost) {
      const hit = this.raycastFloor();
      if (hit) {
        this.ghost.group.visible = true;
        this.ghost.group.position.set(hit.x, 0, hit.z);
      } else {
        this.ghost.group.visible = false;
      }
    }
  };

  private onMouseDown = (e: MouseEvent): void => {
    if (e.button !== 0) return;
    if (this.activeTool !== "select") return;
    if (this.gizmoActive) return;

    this.updatePointer(e);
    const hit = this.raycastElements();
    if (hit) {
      this.isDragging = true;
      this.orbitControls.enabled = false;
      const floorHit = this.raycastFloor();
      if (floorHit) this.dragStart.copy(floorHit);
    }
  };

  private onMouseUp = (_e: MouseEvent): void => {
    if (this.isDragging) {
      this.isDragging = false;
      this.orbitControls.enabled = true;
    }
  };

  private onClick = (e: MouseEvent): void => {
    if (this.isDragging) return;
    this.updatePointer(e);

    if (this.activeTool !== "select") {
      // Place element
      const hit = this.raycastFloor();
      if (!hit) return;

      const el = createElement(this.activeTool);
      el.setPosition(hit.x, 0, hit.z);
      this.state.addElement(el);
      this.onPlace?.(el);
      this.onStatusChange?.(`Placed ${el.name} — click again or press Escape to stop`);
      return;
    }

    // Select / deselect
    const hit = this.raycastElements();
    this.selectElement(hit ?? null);
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
    if (e.key === "Escape") {
      this.cancelTool();
      return;
    }

    if ((e.key === "Delete" || e.key === "Backspace") && this.selectedElement) {
      e.preventDefault();
      const el = this.selectedElement;
      this.selectElement(null);
      this.state.removeElement(el);
      this.onDelete?.(el);
      this.onStatusChange?.(`Deleted ${el.name}`);
      return;
    }

    // Rotate selected element
    if ((e.key === "r" || e.key === "R") && this.selectedElement) {
      const step = e.shiftKey ? -Math.PI / 8 : Math.PI / 8;
      this.selectedElement.setRotationY(this.selectedElement.rotationY + step);
    }
  };

  // ── Selection ──────────────────────────────────────────────────────────────

  selectElement(el: ProductionElement | null): void {
    if (this.selectedElement) {
      this.selectedElement.setSelected(false);
    }
    this.selectedElement = el;
    if (el) {
      el.setSelected(true);
    }
    this.onSelect?.(el);
  }

  // ── Raycasting helpers ─────────────────────────────────────────────────────

  private updatePointer(e: MouseEvent): void {
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  /** Returns the world-space hit point on the floor plane, or null */
  private raycastFloor(): THREE.Vector3 | null {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObject(this.floor, false);
    return hits.length > 0 ? hits[0].point.clone() : null;
  }

  /** Returns the closest production element under the pointer, or null */
  private raycastElements(): ProductionElement | null {
    this.raycaster.setFromCamera(this.pointer, this.camera);

    const candidates: THREE.Object3D[] = [];
    for (const el of this.state.elements.values()) {
      candidates.push(el.group);
    }

    const hits = this.raycaster.intersectObjects(candidates, true);
    for (const hit of hits) {
      let obj: THREE.Object3D | null = hit.object;
      while (obj) {
        if (obj.userData.element) return obj.userData.element as ProductionElement;
        obj = obj.parent;
      }
    }
    return null;
  }

  // ── Ghost helpers ──────────────────────────────────────────────────────────

  private makeGhostTransparent(el: ProductionElement): void {
    el.group.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const mat of mats) {
          (mat as THREE.Material).transparent = true;
          (mat as THREE.Material).opacity = 0.4;
          (mat as THREE.Material).depthWrite = false;
        }
      }
    });
  }

  private clearGhost(): void {
    if (this.ghost) {
      this.scene.remove(this.ghost.group);
      this.ghost.dispose();
      this.ghost = null;
    }
  }
}
