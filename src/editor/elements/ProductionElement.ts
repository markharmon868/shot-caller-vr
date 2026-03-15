import * as THREE from "three";

export interface ElementData {
  id: string;
  type: string;
  name: string;
  position: [number, number, number];
  rotationY: number;
  scale?: [number, number, number];
  properties: Record<string, unknown>;
  /** Catalog item ID from asset-catalog.json, for cost estimation */
  assetId?: string;
  /** Daily rental rate in USD, copied from catalog at placement time */
  dailyRate?: number;
}

/**
 * Base class for all production elements (cameras, lights, cast marks, etc.)
 * Each element owns a THREE.Group and knows how to serialize/deserialize itself.
 */
export abstract class ProductionElement {
  readonly id: string;
  readonly type: string;
  name: string;
  readonly group: THREE.Group;

  constructor(id: string, type: string, name: string) {
    this.id = id;
    this.type = type;
    this.name = name;
    this.group = new THREE.Group();
    this.group.name = `element-${id}`;
    // Back-reference so raycasting can identify which element was hit
    this.group.userData.element = this;
  }

  get position(): THREE.Vector3 {
    return this.group.position;
  }

  get rotationY(): number {
    return this.group.rotation.y;
  }

  setPosition(x: number, y: number, z: number): void {
    this.group.position.set(x, y, z);
  }

  setRotationY(rad: number): void {
    this.group.rotation.y = rad;
  }

  /** Called when selection state changes — subclasses highlight/unhighlight */
  setSelected(selected: boolean): void {
    this.onSelectChanged(selected);
  }

  /** Dim or restore the element for shot review mode */
  setDimmed(dimmed: boolean): void {
    this.group.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        const mat = mesh.material as THREE.Material;
        mat.transparent = dimmed;
        mat.opacity = dimmed ? 0.15 : 1.0;
      }
    });
  }

  protected abstract onSelectChanged(selected: boolean): void;

  abstract getProperties(): Record<string, unknown>;
  abstract setProperty(key: string, value: unknown): void;

  setScale(x: number, y: number, z: number): void {
    this.group.scale.set(x, y, z);
  }

  getScale(): [number, number, number] {
    return [this.group.scale.x, this.group.scale.y, this.group.scale.z];
  }

  /** Serialise to plain JSON for Vercel KV / localStorage */
  serialize(): ElementData {
    return {
      id: this.id,
      type: this.type,
      name: this.name,
      position: [
        this.group.position.x,
        this.group.position.y,
        this.group.position.z,
      ],
      rotationY: this.group.rotation.y,
      scale: this.getScale(),
      properties: this.getProperties(),
    };
  }

  dispose(): void {
    this.group.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.geometry.dispose();
        const mat = mesh.material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat.dispose();
      }
      const line = obj as THREE.LineSegments;
      if (line.isLineSegments || (line as unknown as THREE.Line).isLine) {
        line.geometry.dispose();
        (line.material as THREE.Material).dispose();
      }
      const sprite = obj as THREE.Sprite;
      if (sprite.isSprite) {
        (sprite.material as THREE.SpriteMaterial).map?.dispose();
        sprite.material.dispose();
      }
    });
  }
}
