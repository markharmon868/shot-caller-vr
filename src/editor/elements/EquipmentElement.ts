import * as THREE from "three";
import { ProductionElement } from "./ProductionElement.js";

type EquipmentType = "dolly" | "crane" | "cstand" | "monitor" | "diffusion";

const EQUIPMENT_CONFIGS: Record<
  EquipmentType,
  { label: string; w: number; h: number; d: number; color: number }
> = {
  dolly:     { label: "Dolly",      w: 1.0, h: 0.5, d: 0.6, color: 0x374151 },
  crane:     { label: "Crane",      w: 0.4, h: 2.0, d: 0.4, color: 0x374151 },
  cstand:    { label: "C-Stand",    w: 0.3, h: 1.6, d: 0.3, color: 0x4b5563 },
  monitor:   { label: "Monitor",    w: 0.5, h: 0.4, d: 0.06, color: 0x1f2937 },
  diffusion: { label: "Diffusion",  w: 1.2, h: 1.2, d: 0.04, color: 0xf9fafb },
};

function buildFootprint(w: number, d: number): THREE.LineLoop {
  const y = 0.005;
  const pts = [
    -w / 2, y, -d / 2,
     w / 2, y, -d / 2,
     w / 2, y,  d / 2,
    -w / 2, y,  d / 2,
  ];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  return new THREE.LineLoop(
    geo,
    new THREE.LineBasicMaterial({ color: 0xfb923c, transparent: true, opacity: 0.6 })
  );
}

export class EquipmentElement extends ProductionElement {
  private _equipType: EquipmentType;

  constructor(id: string, name: string, equipType: EquipmentType = "cstand") {
    super(id, "equipment", name);
    this._equipType = equipType;
    this.buildMesh();
  }

  private buildMesh(): void {
    // Remove old children
    while (this.group.children.length > 0) {
      this.group.remove(this.group.children[0]);
    }

    const cfg = EQUIPMENT_CONFIGS[this._equipType];

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(cfg.w, cfg.h, cfg.d),
      new THREE.MeshStandardMaterial({ color: cfg.color, roughness: 0.7 })
    );
    body.position.y = cfg.h / 2;
    this.group.add(body);

    this.group.add(buildFootprint(cfg.w + 0.1, cfg.d + 0.1));
  }

  protected onSelectChanged(selected: boolean): void {
    const mesh = this.group.children[0] as THREE.Mesh;
    if (mesh?.isMesh) {
      (mesh.material as THREE.MeshStandardMaterial).emissive.setHex(
        selected ? 0x1a0800 : 0x000000
      );
    }
  }

  getProperties(): Record<string, unknown> {
    return { equipType: this._equipType };
  }

  setProperty(key: string, value: unknown): void {
    if (key === "equipType") {
      this._equipType = value as EquipmentType;
      this.buildMesh();
    }
    if (key === "name") this.name = String(value);
  }

  static buildPropertiesHTML(el: EquipmentElement): string {
    const current = (el as unknown as { _equipType: string })._equipType;
    const opts = (Object.keys(EQUIPMENT_CONFIGS) as EquipmentType[])
      .map(
        (t) =>
          `<option value="${t}" ${t === current ? "selected" : ""}>${EQUIPMENT_CONFIGS[t].label}</option>`
      )
      .join("");
    return `
      <div class="prop-row">
        <label class="prop-label">Name</label>
        <input class="prop-input" type="text" data-prop="name" value="${el.name}" />
      </div>
      <div class="prop-row">
        <label class="prop-label">Type</label>
        <select class="prop-input" data-prop="equipType">${opts}</select>
      </div>
    `;
  }
}
