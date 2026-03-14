import * as THREE from "three";
import { ProductionElement } from "./ProductionElement.js";

// Department colours
const DEPT_COLORS: Record<string, number> = {
  Camera: 0x4ade80,
  Sound: 0x60a5fa,
  Lighting: 0xfbbf24,
  Director: 0xf472b6,
  AD: 0xc084fc,
  Grip: 0xfb923c,
  Other: 0x94a3b8,
};

function buildSilhouette(color: number): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.6 });

  // Body
  g.add(
    Object.assign(
      new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.8, 8), mat),
      { position: new THREE.Vector3(0, 0.5, 0) }
    )
  );

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), mat);
  head.position.y = 1.0;
  g.add(head);

  // Clearance radius on floor
  const segments = 24;
  const pts: number[] = [];
  const r = 0.5;
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts.push(Math.cos(a) * r, 0.004, Math.sin(a) * r);
  }
  const cirGeo = new THREE.BufferGeometry();
  cirGeo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  g.add(
    new THREE.LineLoop(
      cirGeo,
      new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.4 })
    )
  );

  return g;
}

function buildRoleSprite(role: string, color: number): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 200;
  canvas.height = 48;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = `#${color.toString(16).padStart(6, "0")}22`;
  ctx.strokeStyle = `#${color.toString(16).padStart(6, "0")}`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(2, 2, 196, 44, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = `#${color.toString(16).padStart(6, "0")}`;
  ctx.font = "bold 22px system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(role, 100, 26);
  const tex = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
  sprite.scale.set(0.8, 0.19, 1);
  return sprite;
}

export class CrewElement extends ProductionElement {
  private figureGroup: THREE.Group;
  private roleSprite: THREE.Sprite;
  private _dept: string;

  constructor(id: string, name: string, dept = "Camera") {
    super(id, "crew", name);
    this._dept = dept;
    const color = DEPT_COLORS[dept] ?? DEPT_COLORS.Other;

    this.figureGroup = buildSilhouette(color);
    this.group.add(this.figureGroup);

    this.roleSprite = buildRoleSprite(dept, color);
    this.roleSprite.position.y = 1.35;
    this.group.add(this.roleSprite);
  }

  private rebuild(): void {
    this.group.remove(this.figureGroup);
    this.group.remove(this.roleSprite);
    const color = DEPT_COLORS[this._dept] ?? DEPT_COLORS.Other;
    this.figureGroup = buildSilhouette(color);
    this.group.add(this.figureGroup);
    (this.roleSprite.material as THREE.SpriteMaterial).map?.dispose();
    this.roleSprite.material.dispose();
    this.roleSprite = buildRoleSprite(this._dept, color);
    this.roleSprite.position.y = 1.35;
    this.group.add(this.roleSprite);
  }

  protected onSelectChanged(selected: boolean): void {
    this.figureGroup.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (mat.emissive) mat.emissive.setHex(selected ? 0x111111 : 0x000000);
      }
    });
  }

  getProperties(): Record<string, unknown> {
    return { department: this._dept };
  }

  setProperty(key: string, value: unknown): void {
    if (key === "department") {
      this._dept = String(value);
      this.rebuild();
    }
    if (key === "name") this.name = String(value);
  }

  static buildPropertiesHTML(el: CrewElement): string {
    const dept = (el as unknown as { _dept: string })._dept;
    const opts = Object.keys(DEPT_COLORS)
      .map((d) => `<option value="${d}" ${d === dept ? "selected" : ""}>${d}</option>`)
      .join("");
    return `
      <div class="prop-row">
        <label class="prop-label">Name</label>
        <input class="prop-input" type="text" data-prop="name" value="${el.name}" />
      </div>
      <div class="prop-row">
        <label class="prop-label">Department</label>
        <select class="prop-input" data-prop="department">${opts}</select>
      </div>
    `;
  }
}
