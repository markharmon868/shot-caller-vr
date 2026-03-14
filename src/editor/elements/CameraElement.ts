import * as THREE from "three";
import { ProductionElement } from "./ProductionElement.js";

const BODY_COLOR = 0x1a1a1a;
const BODY_COLOR_SELECTED = 0x3a2a00;
const FOV_COLOR = 0xfbbf24;
const FOV_COLOR_SELECTED = 0xfde68a;

/** Builds a wireframe FOV frustum pointing in the -Z direction */
function buildFovFrustum(
  vFovDeg: number,
  aspectRatio: number,
  near: number,
  far: number,
  color: number
): THREE.LineSegments {
  const vFov = THREE.MathUtils.degToRad(vFovDeg);
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspectRatio);

  const nH = Math.tan(vFov / 2) * near;
  const nW = Math.tan(hFov / 2) * near;
  const fH = Math.tan(vFov / 2) * far;
  const fW = Math.tan(hFov / 2) * far;

  const pts: number[] = [];
  const seg = (ax: number, ay: number, az: number, bx: number, by: number, bz: number) =>
    pts.push(ax, ay, az, bx, by, bz);

  // Near rectangle
  seg(-nW, nH, -near, nW, nH, -near);
  seg(nW, nH, -near, nW, -nH, -near);
  seg(nW, -nH, -near, -nW, -nH, -near);
  seg(-nW, -nH, -near, -nW, nH, -near);

  // Far rectangle
  seg(-fW, fH, -far, fW, fH, -far);
  seg(fW, fH, -far, fW, -fH, -far);
  seg(fW, -fH, -far, -fW, -fH, -far);
  seg(-fW, -fH, -far, -fW, fH, -far);

  // Corner connectors
  seg(-nW, nH, -near, -fW, fH, -far);
  seg(nW, nH, -near, fW, fH, -far);
  seg(nW, -nH, -near, fW, -fH, -far);
  seg(-nW, -nH, -near, -fW, -fH, -far);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.85 });
  return new THREE.LineSegments(geo, mat);
}

function buildCameraBody(): THREE.Group {
  const g = new THREE.Group();

  // Main body
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.18, 0.38),
    new THREE.MeshStandardMaterial({ color: BODY_COLOR, roughness: 0.6 })
  );
  g.add(body);

  // Lens barrel
  const lens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.07, 0.22, 16),
    new THREE.MeshStandardMaterial({ color: 0x0d0d0d, roughness: 0.4, metalness: 0.6 })
  );
  lens.rotation.x = Math.PI / 2;
  lens.position.set(0, 0, -0.28);
  g.add(lens);

  // Lens front glass
  const glass = new THREE.Mesh(
    new THREE.CircleGeometry(0.06, 16),
    new THREE.MeshStandardMaterial({ color: 0x1a3a6a, roughness: 0.1, metalness: 0.9 })
  );
  glass.position.set(0, 0, -0.39);
  g.add(glass);

  // Top handle
  const handle = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.14, 0.24),
    new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.7 })
  );
  handle.position.set(0, 0.16, -0.04);
  g.add(handle);

  return g;
}

export class CameraElement extends ProductionElement {
  private bodyGroup: THREE.Group;
  private fovLines: THREE.LineSegments;

  // Properties
  private _focalLength = 35; // mm
  private _aspectRatio = 16 / 9;
  private _fovDistance = 4; // metres to show frustum

  private get _vFov(): number {
    // Vertical FOV from focal length (Super 35 sensor: 24mm height)
    return (2 * Math.atan(24 / (2 * this._focalLength)) * 180) / Math.PI;
  }

  constructor(id: string, name: string) {
    super(id, "camera", name);

    this.bodyGroup = buildCameraBody();
    this.bodyGroup.position.y = 0.09; // sit on floor
    this.group.add(this.bodyGroup);

    this.fovLines = buildFovFrustum(
      this._vFov,
      this._aspectRatio,
      0.3,
      this._fovDistance,
      FOV_COLOR
    );
    this.fovLines.position.copy(this.bodyGroup.position);
    this.group.add(this.fovLines);
  }

  private rebuildFov(): void {
    this.group.remove(this.fovLines);
    this.fovLines.geometry.dispose();
    (this.fovLines.material as THREE.Material).dispose();
    this.fovLines = buildFovFrustum(
      this._vFov,
      this._aspectRatio,
      0.3,
      this._fovDistance,
      FOV_COLOR
    );
    this.fovLines.position.copy(this.bodyGroup.position);
    this.group.add(this.fovLines);
  }

  protected onSelectChanged(selected: boolean): void {
    this.bodyGroup.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.emissive?.setHex(selected ? 0x3a2a00 : 0x000000);
      }
    });
    (this.fovLines.material as THREE.LineBasicMaterial).color.setHex(
      selected ? FOV_COLOR_SELECTED : FOV_COLOR
    );
  }

  getProperties(): Record<string, unknown> {
    return {
      focalLength: this._focalLength,
      aspectRatio: this._aspectRatio,
      fovDistance: this._fovDistance,
    };
  }

  setProperty(key: string, value: unknown): void {
    switch (key) {
      case "focalLength":
        this._focalLength = Number(value);
        this.rebuildFov();
        break;
      case "fovDistance":
        this._fovDistance = Number(value);
        this.rebuildFov();
        break;
      case "aspectRatio":
        this._aspectRatio = Number(value);
        this.rebuildFov();
        break;
    }
  }

  /** Returns HTML for the properties panel */
  static buildPropertiesHTML(el: CameraElement): string {
    const fl = el._focalLength;
    const fd = el._fovDistance;
    return `
      <div class="prop-row">
        <label class="prop-label">Name</label>
        <input class="prop-input" type="text" data-prop="name" value="${el.name}" />
      </div>
      <div class="prop-row">
        <label class="prop-label">
          Focal Length (mm) <span class="prop-value">${fl}mm</span>
        </label>
        <input class="prop-input" type="range" data-prop="focalLength"
          min="14" max="200" step="1" value="${fl}" />
      </div>
      <div class="prop-row">
        <label class="prop-label">
          FOV Depth (m) <span class="prop-value">${fd}m</span>
        </label>
        <input class="prop-input" type="range" data-prop="fovDistance"
          min="1" max="20" step="0.5" value="${fd}" />
      </div>
    `;
  }
}
