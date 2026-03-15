import * as THREE from "three";
import { ProductionElement } from "./ProductionElement.js";

const PROP_COLOR = 0xf97316;
const PROP_COLOR_SELECTED = 0xfed7aa;

function buildPropMesh(width: number, height: number, depth: number): THREE.Group {
  const g = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshStandardMaterial({ color: PROP_COLOR, roughness: 0.7 })
  );
  body.position.y = height / 2;
  g.add(body);

  // Wireframe outline so it reads clearly in the scene
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(body.geometry),
    new THREE.LineBasicMaterial({ color: 0xfed7aa, transparent: true, opacity: 0.6 })
  );
  edges.position.copy(body.position);
  g.add(edges);

  return g;
}

export class PropsElement extends ProductionElement {
  private propGroup: THREE.Group;
  private _description = "";
  private _quantity = 1;
  private _width = 0.3;
  private _height = 0.3;
  private _depth = 0.3;

  constructor(id: string, name: string) {
    super(id, "props", name);
    this.propGroup = buildPropMesh(this._width, this._height, this._depth);
    this.group.add(this.propGroup);
  }

  private rebuildMesh(): void {
    this.group.remove(this.propGroup);
    this.propGroup.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if (m.isMesh || (m as unknown as THREE.LineSegments).isLineSegments) {
        (m.geometry as THREE.BufferGeometry).dispose();
        const mat = (m as THREE.Mesh).material;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else (mat as THREE.Material).dispose();
      }
    });
    this.propGroup = buildPropMesh(this._width, this._height, this._depth);
    this.group.add(this.propGroup);
  }

  protected onSelectChanged(selected: boolean): void {
    this.propGroup.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (mat.emissive) mat.emissive.setHex(selected ? 0x7c2d12 : 0x000000);
      }
    });
  }

  getProperties(): Record<string, unknown> {
    return {
      description: this._description,
      quantity: this._quantity,
      width: this._width,
      height: this._height,
      depth: this._depth,
    };
  }

  setProperty(key: string, value: unknown): void {
    switch (key) {
      case "description": this._description = String(value); break;
      case "quantity":    this._quantity = Number(value); break;
      case "width":       this._width = Number(value);  this.rebuildMesh(); break;
      case "height":      this._height = Number(value); this.rebuildMesh(); break;
      case "depth":       this._depth = Number(value);  this.rebuildMesh(); break;
    }
  }

  static buildPropertiesHTML(el: PropsElement): string {
    const p = el.getProperties() as { description: string; quantity: number; width: number; height: number; depth: number };
    return `
      <div class="prop-row">
        <label class="prop-label">Name</label>
        <input class="prop-input" type="text" data-prop="name" value="${el.name}" />
      </div>
      <div class="prop-row">
        <label class="prop-label">Description</label>
        <input class="prop-input" type="text" data-prop="description" value="${p.description}" placeholder="e.g. Hero briefcase" />
      </div>
      <div class="prop-row">
        <label class="prop-label">Quantity</label>
        <input class="prop-input" type="number" data-prop="quantity" min="1" max="99" value="${p.quantity}" />
      </div>
      <div class="prop-row">
        <label class="prop-label">Width (m) <span class="prop-value">${p.width}m</span></label>
        <input class="prop-input" type="range" data-prop="width" min="0.05" max="3" step="0.05" value="${p.width}" />
      </div>
      <div class="prop-row">
        <label class="prop-label">Height (m) <span class="prop-value">${p.height}m</span></label>
        <input class="prop-input" type="range" data-prop="height" min="0.05" max="3" step="0.05" value="${p.height}" />
      </div>
      <div class="prop-row">
        <label class="prop-label">Depth (m) <span class="prop-value">${p.depth}m</span></label>
        <input class="prop-input" type="range" data-prop="depth" min="0.05" max="3" step="0.05" value="${p.depth}" />
      </div>
    `;
  }
}
