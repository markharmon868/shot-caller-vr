import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { ProductionElement } from "./ProductionElement.js";

const loader = new GLTFLoader();

export class GltfElement extends ProductionElement {
  private _url: string;
  private _fileName: string;
  private _placeholder: THREE.Mesh;

  constructor(id: string, name: string, url: string, fileName?: string) {
    super(id, "gltf", name);
    this._url = url;
    this._fileName = fileName ?? name;

    // Wireframe box shown while loading / if load fails
    const geo = new THREE.BoxGeometry(0.6, 1.2, 0.6);
    const mat = new THREE.MeshStandardMaterial({ color: 0x4a90d9, wireframe: true });
    this._placeholder = new THREE.Mesh(geo, mat);
    this._placeholder.position.y = 0.6;
    this.group.add(this._placeholder);
  }

  get url(): string { return this._url; }
  get fileName(): string { return this._fileName; }

  /** Load the GLTF/GLB and replace the placeholder. Resolves when done. */
  async load(): Promise<void> {
    return new Promise((resolve, reject) => {
      loader.load(
        this._url,
        (gltf) => {
          const model = gltf.scene;

          // Auto-scale so longest axis fits within 3 m
          const box = new THREE.Box3().setFromObject(model);
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          if (maxDim > 3) model.scale.setScalar(3 / maxDim);

          // Shift bottom to floor (y=0)
          const box2 = new THREE.Box3().setFromObject(model);
          model.position.y -= box2.min.y;

          // Remove placeholder, add model
          this.group.remove(this._placeholder);
          this._placeholder.geometry.dispose();
          (this._placeholder.material as THREE.Material).dispose();

          this.group.add(model);
          resolve();
        },
        undefined,
        (err) => reject(err),
      );
    });
  }

  protected onSelectChanged(_selected: boolean): void {
    // No highlight needed — transform gizmo provides feedback
  }

  getProperties(): Record<string, unknown> {
    return { url: this._url, fileName: this._fileName };
  }

  setProperty(key: string, value: unknown): void {
    if (key === "url") this._url = String(value);
    if (key === "fileName") this._fileName = String(value);
  }

  static buildPropertiesHTML(el: GltfElement): string {
    return `
      <div class="prop-row">
        <label class="prop-label">File</label>
        <span style="color:#e2e8f0;font-size:10px;word-break:break-all">${el.fileName}</span>
      </div>
    `;
  }
}
