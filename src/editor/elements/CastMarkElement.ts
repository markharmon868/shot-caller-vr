import * as THREE from "three";
import { ProductionElement } from "./ProductionElement.js";

const MARK_COLOR = 0xfbbf24; // gold tape
const MARK_COLOR_SELECTED = 0xfde68a;

function buildFloorX(color: number): THREE.LineSegments {
  const s = 0.3;
  const y = 0.005; // just above floor
  const pts = [
    -s, y, -s,   s, y,  s,  // diagonal /
     s, y, -s,  -s, y,  s,  // diagonal \
    // outer rectangle border
    -s, y, -s,   s, y, -s,
     s, y, -s,   s, y,  s,
     s, y,  s,  -s, y,  s,
    -s, y,  s,  -s, y, -s,
  ];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  return new THREE.LineSegments(
    geo,
    new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 })
  );
}

/** Arrow indicating actor's eyeline direction (points in -Z = forward) */
function buildEyelineArrow(color: number): THREE.LineSegments {
  const len = 0.5;
  const hw = 0.1; // arrowhead half-width
  const pts = [
    0, 0.01, 0,       0, 0.01, -len,         // shaft
    0, 0.01, -len,    -hw, 0.01, -(len - 0.14), // left barb
    0, 0.01, -len,     hw, 0.01, -(len - 0.14), // right barb
  ];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  return new THREE.LineSegments(
    geo,
    new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.7 })
  );
}

function buildLabelSprite(text: string): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "rgba(13, 2, 33, 0.75)";
  ctx.beginPath();
  ctx.roundRect(4, 4, 248, 56, 8);
  ctx.fill();

  ctx.strokeStyle = "#fbbf24";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(4, 4, 248, 56, 8);
  ctx.stroke();

  ctx.fillStyle = "#fbbf24";
  ctx.font = "bold 26px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 128, 34);

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(0.9, 0.22, 1);
  return sprite;
}

/** Clearance radius circle on the floor */
function buildClearanceCircle(radius: number, color: number): THREE.LineLoop {
  const segments = 32;
  const pts: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts.push(Math.cos(a) * radius, 0.004, Math.sin(a) * radius);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  return new THREE.LineLoop(
    geo,
    new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.35 })
  );
}

export class CastMarkElement extends ProductionElement {
  private xMark: THREE.LineSegments;
  private arrow: THREE.LineSegments;
  private labelSprite: THREE.Sprite;
  private clearCircle: THREE.LineLoop;

  private _actorName: string;
  private _sceneNumber = 1;

  constructor(id: string, name: string, actorName = "Actor") {
    super(id, "cast_mark", name);
    this._actorName = actorName;

    this.xMark = buildFloorX(MARK_COLOR);
    this.group.add(this.xMark);

    this.arrow = buildEyelineArrow(MARK_COLOR);
    this.group.add(this.arrow);

    this.clearCircle = buildClearanceCircle(0.6, MARK_COLOR);
    this.group.add(this.clearCircle);

    this.labelSprite = buildLabelSprite(this._actorName);
    this.labelSprite.position.set(0, 1.0, 0);
    this.group.add(this.labelSprite);
  }

  private refreshLabel(): void {
    this.group.remove(this.labelSprite);
    (this.labelSprite.material as THREE.SpriteMaterial).map?.dispose();
    this.labelSprite.material.dispose();
    this.labelSprite = buildLabelSprite(this._actorName);
    this.labelSprite.position.set(0, 1.0, 0);
    this.group.add(this.labelSprite);
  }

  protected onSelectChanged(selected: boolean): void {
    const color = selected ? MARK_COLOR_SELECTED : MARK_COLOR;
    (this.xMark.material as THREE.LineBasicMaterial).color.setHex(color);
    (this.arrow.material as THREE.LineBasicMaterial).color.setHex(color);
  }

  getProperties(): Record<string, unknown> {
    return {
      actorName: this._actorName,
      sceneNumber: this._sceneNumber,
    };
  }

  setProperty(key: string, value: unknown): void {
    switch (key) {
      case "actorName":
        this._actorName = String(value);
        this.refreshLabel();
        break;
      case "sceneNumber":
        this._sceneNumber = Number(value);
        break;
      case "name":
        this.name = String(value);
        break;
    }
  }

  static buildPropertiesHTML(el: CastMarkElement): string {
    const props = el.getProperties();
    return `
      <div class="prop-row">
        <label class="prop-label">Label</label>
        <input class="prop-input" type="text" data-prop="actorName"
          value="${props.actorName}" placeholder="Actor / character name" />
      </div>
      <div class="prop-row">
        <label class="prop-label">Scene Number</label>
        <input class="prop-input" type="number" data-prop="sceneNumber"
          min="1" value="${props.sceneNumber}" />
      </div>
    `;
  }
}
