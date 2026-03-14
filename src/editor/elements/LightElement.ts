import * as THREE from "three";
import { ProductionElement } from "./ProductionElement.js";

/** Coverage cone material — updates colour when colour temp changes */
function makeCoveMat(colorHex: number): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: colorHex,
    transparent: true,
    opacity: 0.18,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
}

/** Simple cone edges wireframe */
function buildConeEdges(
  radius: number,
  height: number,
  segments: number,
  color: number
): THREE.LineSegments {
  const pts: number[] = [];
  const seg = (ax: number, ay: number, az: number, bx: number, by: number, bz: number) =>
    pts.push(ax, ay, az, bx, by, bz);

  // Ring at base
  for (let i = 0; i < segments; i++) {
    const a0 = (i / segments) * Math.PI * 2;
    const a1 = ((i + 1) / segments) * Math.PI * 2;
    seg(
      Math.cos(a0) * radius, -height, Math.sin(a0) * radius,
      Math.cos(a1) * radius, -height, Math.sin(a1) * radius
    );
    // Every 4th segment draw a spoke from tip to ring
    if (i % 4 === 0) {
      seg(0, 0, 0, Math.cos(a0) * radius, -height, Math.sin(a0) * radius);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  return new THREE.LineSegments(
    geo,
    new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.6 })
  );
}

/** Kelvin colour temperature to approximate RGB */
function kelvinToHex(k: number): number {
  // Simplified approximation (1000K–10000K)
  k = Math.max(1000, Math.min(10000, k));
  let r: number, g: number, b: number;

  if (k <= 6600) {
    r = 255;
    g = Math.min(255, Math.round(99.4708025861 * Math.log(k / 100) - 161.1195681661));
    b = k <= 1900 ? 0 : Math.min(255, Math.round(138.5177312231 * Math.log(k / 100 - 10) - 305.0447927307));
  } else {
    r = Math.min(255, Math.round(329.698727446 * Math.pow(k / 100 - 60, -0.1332047592)));
    g = Math.min(255, Math.round(288.1221695283 * Math.pow(k / 100 - 60, -0.0755148492)));
    b = 255;
  }

  return (Math.max(0, r) << 16) | (Math.max(0, g) << 8) | Math.max(0, b);
}

function buildLightPanel(colorHex: number): THREE.Group {
  const g = new THREE.Group();

  // LED panel body
  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.4, 0.06),
    new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.4,
      metalness: 0.5,
    })
  );
  g.add(panel);

  // Emissive face
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(0.52, 0.32),
    new THREE.MeshBasicMaterial({ color: colorHex })
  );
  face.position.z = 0.035;
  g.add(face);

  // Stand (simple pole)
  const stand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 1.2, 8),
    new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.6 })
  );
  stand.position.y = -0.8;
  g.add(stand);

  return g;
}

export class LightElement extends ProductionElement {
  private panelGroup: THREE.Group;
  private coverageCone: THREE.Mesh;
  private coneEdges: THREE.LineSegments;
  private panelFace: THREE.Mesh;

  private _colorTemp = 5600; // Kelvin
  private _coneAngle = 40; // degrees half-angle
  private _coneDistance = 3; // metres

  constructor(id: string, name: string) {
    super(id, "light", name);

    const colorHex = kelvinToHex(this._colorTemp);

    this.panelGroup = buildLightPanel(colorHex);
    this.panelGroup.position.y = 1.4; // stand puts it up high
    this.group.add(this.panelGroup);

    // The face mesh is the 3rd child (index 2) of panelGroup
    this.panelFace = this.panelGroup.children[2] as THREE.Mesh;

    // Coverage cone geometry: ConeGeometry tip-down, tip at panel position
    const radius = Math.tan(THREE.MathUtils.degToRad(this._coneAngle)) * this._coneDistance;
    this.coverageCone = new THREE.Mesh(
      new THREE.ConeGeometry(radius, this._coneDistance, 16, 1, true),
      makeCoveMat(colorHex)
    );
    // Tip at panel Z-front, opens downward
    this.coverageCone.position.set(0, 1.4 - this._coneDistance / 2, 0.035);
    this.group.add(this.coverageCone);

    this.coneEdges = buildConeEdges(radius, this._coneDistance, 16, colorHex);
    this.coneEdges.position.set(0, 1.4, 0.035);
    this.group.add(this.coneEdges);
  }

  private rebuildCone(): void {
    const colorHex = kelvinToHex(this._colorTemp);
    const radius = Math.tan(THREE.MathUtils.degToRad(this._coneAngle)) * this._coneDistance;

    this.group.remove(this.coverageCone);
    this.group.remove(this.coneEdges);
    this.coverageCone.geometry.dispose();
    (this.coverageCone.material as THREE.Material).dispose();
    this.coneEdges.geometry.dispose();
    (this.coneEdges.material as THREE.Material).dispose();

    this.coverageCone = new THREE.Mesh(
      new THREE.ConeGeometry(radius, this._coneDistance, 16, 1, true),
      makeCoveMat(colorHex)
    );
    this.coverageCone.position.set(0, 1.4 - this._coneDistance / 2, 0.035);
    this.group.add(this.coverageCone);

    this.coneEdges = buildConeEdges(radius, this._coneDistance, 16, colorHex);
    this.coneEdges.position.set(0, 1.4, 0.035);
    this.group.add(this.coneEdges);

    // Update panel face colour
    (this.panelFace.material as THREE.MeshBasicMaterial).color.setHex(colorHex);
  }

  protected onSelectChanged(selected: boolean): void {
    this.panelGroup.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (mat.emissive) mat.emissive.setHex(selected ? 0x1a1000 : 0x000000);
      }
    });
  }

  getProperties(): Record<string, unknown> {
    return {
      colorTemp: this._colorTemp,
      coneAngle: this._coneAngle,
      coneDistance: this._coneDistance,
    };
  }

  setProperty(key: string, value: unknown): void {
    switch (key) {
      case "colorTemp":
        this._colorTemp = Number(value);
        this.rebuildCone();
        break;
      case "coneAngle":
        this._coneAngle = Number(value);
        this.rebuildCone();
        break;
      case "coneDistance":
        this._coneDistance = Number(value);
        this.rebuildCone();
        break;
    }
  }

  static buildPropertiesHTML(el: LightElement): string {
    const ct = (el as unknown as { _colorTemp: number })._colorTemp;
    const ca = (el as unknown as { _coneAngle: number })._coneAngle;
    return `
      <div class="prop-row">
        <label class="prop-label">Name</label>
        <input class="prop-input" type="text" data-prop="name" value="${el.name}" />
      </div>
      <div class="prop-row">
        <label class="prop-label">
          Colour Temp (K) <span class="prop-value">${ct}K</span>
        </label>
        <input class="prop-input" type="range" data-prop="colorTemp"
          min="2000" max="8000" step="100" value="${ct}" />
      </div>
      <div class="prop-row">
        <label class="prop-label">
          Spread Angle (°) <span class="prop-value">${ca}°</span>
        </label>
        <input class="prop-input" type="range" data-prop="coneAngle"
          min="5" max="80" step="1" value="${ca}" />
      </div>
    `;
  }
}
