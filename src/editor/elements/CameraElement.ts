import * as THREE from "three";
import { ProductionElement } from "./ProductionElement.js";

const BODY_COLOR = 0x1a1a1a;
const FOV_COLOR = 0xfbbf24;
const FOV_COLOR_SELECTED = 0xfde68a;

export const SETUP_GROUP_COLORS: Record<string, number> = {
  A: 0xc0392b,
  B: 0x2980b9,
  C: 0x27ae60,
  D: 0xd4ac0d,
  "": BODY_COLOR,
};

export const SHOT_TYPES = ["", "Wide", "Medium", "CU", "OTS", "Insert", "POV"] as const;
export type ShotType = (typeof SHOT_TYPES)[number];

/** Build a canvas sprite showing a shot number badge */
function buildBadgeSprite(num: number, groupColor: number): THREE.Sprite {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  // Outer circle
  const r = (groupColor !== BODY_COLOR ? groupColor : 0xfbbf24);
  const hex = "#" + r.toString(16).padStart(6, "0");
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, 56, 0, Math.PI * 2);
  ctx.fillStyle = hex;
  ctx.fill();

  // Number
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${num < 10 ? 64 : 48}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(num), size / 2, size / 2 + 2);

  const texture = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: texture, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(0.5, 0.5, 1);
  sprite.position.set(0, 0.6, 0);
  sprite.name = "shot-badge";
  return sprite;
}

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

  seg(-nW, nH, -near, nW, nH, -near);
  seg(nW, nH, -near, nW, -nH, -near);
  seg(nW, -nH, -near, -nW, -nH, -near);
  seg(-nW, -nH, -near, -nW, nH, -near);

  seg(-fW, fH, -far, fW, fH, -far);
  seg(fW, fH, -far, fW, -fH, -far);
  seg(fW, -fH, -far, -fW, -fH, -far);
  seg(-fW, -fH, -far, -fW, fH, -far);

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

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.18, 0.38),
    new THREE.MeshStandardMaterial({ color: BODY_COLOR, roughness: 0.6 })
  );
  g.add(body);

  const lens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.07, 0.22, 16),
    new THREE.MeshStandardMaterial({ color: 0x0d0d0d, roughness: 0.4, metalness: 0.6 })
  );
  lens.rotation.x = Math.PI / 2;
  lens.position.set(0, 0, -0.28);
  g.add(lens);

  const glass = new THREE.Mesh(
    new THREE.CircleGeometry(0.06, 16),
    new THREE.MeshStandardMaterial({ color: 0x1a3a6a, roughness: 0.1, metalness: 0.9 })
  );
  glass.position.set(0, 0, -0.39);
  g.add(glass);

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
  private badgeSprite: THREE.Sprite | null = null;

  // FOV properties
  private _focalLength = 35;
  private _aspectRatio = 16 / 9;
  private _fovDistance = 4;

  // Shot sequencing properties
  private _shotNumber: number | null = null;
  private _shotType: ShotType = "";
  private _shotLabel = "";
  private _setupGroup = "";

  private get _vFov(): number {
    return (2 * Math.atan(24 / (2 * this._focalLength)) * 180) / Math.PI;
  }

  constructor(id: string, name: string) {
    super(id, "camera", name);

    this.bodyGroup = buildCameraBody();
    this.bodyGroup.position.y = 0.09;
    this.group.add(this.bodyGroup);

    this.fovLines = buildFovFrustum(this._vFov, this._aspectRatio, 0.3, this._fovDistance, FOV_COLOR);
    this.fovLines.position.copy(this.bodyGroup.position);
    this.group.add(this.fovLines);
  }

  get shotNumber(): number | null { return this._shotNumber; }
  get shotType(): ShotType { return this._shotType; }
  get shotLabel(): string { return this._shotLabel; }
  get setupGroup(): string { return this._setupGroup; }
  get vFovDeg(): number { return this._vFov; }
  get aspectRatio(): number { return this._aspectRatio; }

  setShotNumber(n: number | null): void {
    this._shotNumber = n;
    this.refreshBadge();
  }

  private refreshBadge(): void {
    if (this.badgeSprite) {
      this.group.remove(this.badgeSprite);
      (this.badgeSprite.material as THREE.SpriteMaterial).map?.dispose();
      this.badgeSprite.material.dispose();
      this.badgeSprite = null;
    }
    if (this._shotNumber !== null) {
      const groupColor = SETUP_GROUP_COLORS[this._setupGroup] ?? BODY_COLOR;
      this.badgeSprite = buildBadgeSprite(this._shotNumber, groupColor);
      this.group.add(this.badgeSprite);
    }
  }

  private applyGroupColor(): void {
    const color = SETUP_GROUP_COLORS[this._setupGroup] ?? BODY_COLOR;
    const body = this.bodyGroup.children[0] as THREE.Mesh;
    (body.material as THREE.MeshStandardMaterial).color.setHex(color === BODY_COLOR ? BODY_COLOR : color);
    if (this._shotNumber !== null) this.refreshBadge();
  }

  /** Highlight this camera as the active shot in review mode */
  setReviewActive(active: boolean): void {
    this.bodyGroup.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (mat.emissive) mat.emissive.setHex(active ? 0x4a3800 : 0x000000);
        mat.transparent = false;
        mat.opacity = 1.0;
      }
    });
    (this.fovLines.material as THREE.LineBasicMaterial).color.setHex(
      active ? 0xfde68a : FOV_COLOR
    );
    (this.fovLines.material as THREE.LineBasicMaterial).opacity = active ? 1.0 : 0.85;
  }

  private rebuildFov(): void {
    this.group.remove(this.fovLines);
    this.fovLines.geometry.dispose();
    (this.fovLines.material as THREE.Material).dispose();
    this.fovLines = buildFovFrustum(this._vFov, this._aspectRatio, 0.3, this._fovDistance, FOV_COLOR);
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
      shotNumber: this._shotNumber,
      shotType: this._shotType,
      shotLabel: this._shotLabel,
      setupGroup: this._setupGroup,
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
      case "shotNumber":
        this._shotNumber = value === null || value === "" ? null : Number(value);
        this.refreshBadge();
        break;
      case "shotType":
        this._shotType = String(value) as ShotType;
        break;
      case "shotLabel":
        this._shotLabel = String(value);
        break;
      case "setupGroup":
        this._setupGroup = String(value);
        this.applyGroupColor();
        break;
    }
  }

  static buildPropertiesHTML(el: CameraElement): string {
    const fl = el._focalLength;
    const fd = el._fovDistance;
    const shotTypes = SHOT_TYPES.map(
      (t) => `<option value="${t}" ${el._shotType === t ? "selected" : ""}>${t || "— None —"}</option>`
    ).join("");
    const groups = ["", "A", "B", "C", "D"].map(
      (g) => `<option value="${g}" ${el._setupGroup === g ? "selected" : ""}>${g || "— None —"}</option>`
    ).join("");

    return `
      <div class="prop-row">
        <label class="prop-label">Name</label>
        <input class="prop-input" type="text" data-prop="name" value="${el.name}" />
      </div>
      <div class="prop-row">
        <label class="prop-label">Shot # <span class="prop-value">${el._shotNumber ?? "—"}</span></label>
        <input class="prop-input" type="number" data-prop="shotNumber" min="1" max="99"
          value="${el._shotNumber ?? ""}" placeholder="Assign in Sequence Mode" />
      </div>
      <div class="prop-row">
        <label class="prop-label">Shot Type</label>
        <select class="prop-input" data-prop="shotType">${shotTypes}</select>
      </div>
      <div class="prop-row">
        <label class="prop-label">Shot Label</label>
        <input class="prop-input" type="text" data-prop="shotLabel"
          value="${el._shotLabel}" placeholder="e.g. Establishing — hero enters" />
      </div>
      <div class="prop-row">
        <label class="prop-label">Setup Group</label>
        <select class="prop-input" data-prop="setupGroup">${groups}</select>
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
