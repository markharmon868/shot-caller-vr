import * as THREE from "three";
import type { ProductionElement, ElementData } from "./elements/ProductionElement.js";
import { CameraElement } from "./elements/CameraElement.js";
import { LightElement } from "./elements/LightElement.js";
import { CastMarkElement } from "./elements/CastMarkElement.js";
import { CrewElement } from "./elements/CrewElement.js";
import { EquipmentElement } from "./elements/EquipmentElement.js";
import { PropsElement } from "./elements/PropsElement.js";
import { GltfElement } from "./elements/GltfElement.js";
import { getActiveScene } from "../sceneManager.js";

export interface SceneData {
  id: string;
  title?: string;
  splatUrl: string;
  splatOffset?: [number, number, number];
  elements: ElementData[];
  savedAt: string;
}

const STORAGE_KEY_PREFIX = "shot-caller-scene-";

/** Generates a short random scene ID */
function generateId(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

/** Counters for auto-naming elements */
const typeCounts: Record<string, number> = {};
function nextName(type: string): string {
  typeCounts[type] = (typeCounts[type] ?? 0) + 1;
  const labels: Record<string, string> = {
    camera: "Camera",
    light: "Light",
    cast_mark: "Actor",
    crew: "Crew",
    equipment: "Equipment",
    props: "Prop",
    set_dressing: "Set Piece",
  };
  return `${labels[type] ?? type} ${typeCounts[type]}`;
}

export function createElementById(
  id: string,
  type: string,
  name: string,
  properties?: Record<string, unknown>,
): ProductionElement {
  switch (type) {
    case "camera":    return new CameraElement(id, name);
    case "light":     return new LightElement(id, name);
    case "cast_mark": return new CastMarkElement(id, name);
    case "crew":      return new CrewElement(id, name);
    case "equipment": return new EquipmentElement(id, name);
    case "props":     return new PropsElement(id, name);
    case "gltf":      return new GltfElement(
      id, name,
      String(properties?.url ?? ""),
      String(properties?.fileName ?? name),
    );
    default:          return new CameraElement(id, name);
  }
}

export function createElement(type: string): ProductionElement {
  const id = generateId();
  const name = nextName(type);
  return createElementById(id, type, name);
}

/**
 * Manages the collection of placed production elements and handles
 * serialisation / deserialisation to JSON (localStorage + Vercel KV hook).
 */
export class SceneState {
  private sceneId: string;
  private sceneTitle = "Untitled Scene";
  private splatUrl = "";
  splatOffset: [number, number, number] = [0, 0, 0];
  readonly elements = new Map<string, ProductionElement>();

  constructor(private scene: THREE.Scene) {
    const url = new URL(window.location.href);
    this.sceneId = url.searchParams.get("scene") ?? getActiveScene();
    this.updateUrl();
  }

  private updateUrl(): void {
    const url = new URL(window.location.href);
    url.searchParams.set("scene", this.sceneId);
    window.history.replaceState({}, "", url.toString());
  }

  get id(): string { return this.sceneId; }
  get title(): string { return this.sceneTitle; }
  setTitle(t: string): void { this.sceneTitle = t || "Untitled Scene"; }

  setSplatUrl(url: string): void { this.splatUrl = url; }
  getSplatUrl(): string { return this.splatUrl; }

  addElement(el: ProductionElement): void {
    this.elements.set(el.id, el);
    this.scene.add(el.group);
  }

  removeElement(el: ProductionElement): void {
    this.elements.delete(el.id);
    this.scene.remove(el.group);
    el.dispose();
  }

  // ── Serialisation ─────────────────────────────────────────────────────────

  toJSON(): SceneData {
    return {
      id: this.sceneId,
      title: this.sceneTitle,
      splatUrl: this.splatUrl,
      splatOffset: [...this.splatOffset],
      elements: Array.from(this.elements.values()).map((el) => el.serialize()),
      savedAt: new Date().toISOString(),
    };
  }

  loadFromJSON(data: SceneData): void {
    // Clear existing
    for (const el of this.elements.values()) {
      this.scene.remove(el.group);
      el.dispose();
    }
    this.elements.clear();
    typeCounts["camera"] = typeCounts["light"] = typeCounts["cast_mark"] =
      typeCounts["crew"] = typeCounts["equipment"] = typeCounts["props"] = 0;

    this.sceneId = data.id;
    this.sceneTitle = data.title ?? "Untitled Scene";
    this.splatUrl = data.splatUrl;
    this.splatOffset = data.splatOffset ?? [0, 0, 0];
    this.updateUrl();

    for (const ed of data.elements) {
      const el = createElementById(ed.id, ed.type, ed.name, ed.properties);
      el.setPosition(...ed.position);
      el.setRotationY(ed.rotationY);
      if (ed.scale) el.setScale(...ed.scale);
      for (const [k, v] of Object.entries(ed.properties)) {
        el.setProperty(k, v);
      }
      this.addElement(el);
    }
  }

  clearElements(): void {
    for (const el of this.elements.values()) {
      this.scene.remove(el.group);
      el.dispose();
    }
    this.elements.clear();
    typeCounts["camera"] = typeCounts["light"] = typeCounts["cast_mark"] =
      typeCounts["crew"] = typeCounts["equipment"] = 0;
    // Persist the cleared state so VR and future loads also start blank
    this.saveLocal();
  }

  // ── localStorage persistence ───────────────────────────────────────────────

  /** Saves to localStorage. Returns false if payload too large for VR handoff (>900KB). */
  saveLocal(): boolean {
    const data = this.toJSON();
    const payload = JSON.stringify(data);
    if (payload.length > 900_000) {
      return false;
    }
    localStorage.setItem(STORAGE_KEY_PREFIX + this.sceneId, JSON.stringify(data));
    this.saveBridgeElements(data);
    return true;
  }

  clearAll(): void {
    for (const el of this.elements.values()) {
      this.scene.remove(el.group);
      el.dispose();
    }
    this.elements.clear();
    typeCounts["camera"] = typeCounts["light"] = typeCounts["cast_mark"] =
      typeCounts["crew"] = typeCounts["equipment"] = typeCounts["props"] = 0;
  }

  loadLocal(id?: string): boolean {
    const key = STORAGE_KEY_PREFIX + (id ?? this.sceneId);
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    try {
      this.loadFromJSON(JSON.parse(raw) as SceneData);
      return true;
    } catch (e) {
      console.error("[SceneState] Failed to parse saved scene:", e);
      return false;
    }
  }

  // ── Vercel KV (hook for Teammate 1 backend integration) ───────────────────

  async saveToKV(): Promise<void> {
    const data = this.toJSON();
    try {
      const res = await fetch("/api/scene", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: this.sceneId, scene: data }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      console.log(`[SceneState] Saved scene ${this.sceneId} to Vercel KV`);
    } catch (e) {
      console.warn("[SceneState] Vercel KV save failed, falling back to localStorage:", e);
      this.saveLocal();
    }
  }

  async loadFromKV(id?: string): Promise<boolean> {
    const sceneId = id ?? this.sceneId;
    try {
      const res = await fetch(`/api/scene?id=${sceneId}`);
      if (!res.ok) return false;
      const data = (await res.json()) as SceneData;
      this.loadFromJSON(data);
      return true;
    } catch (e) {
      console.warn("[SceneState] Vercel KV load failed, trying localStorage:", e);
      return this.loadLocal(sceneId);
    }
  }

  // ── SceneBundle bridge (editor → stage4-xr) ───────────────────────────────
  // Converts editor elements to the SceneBundle element format and writes them
  // to localStorage under the key sceneStore reads, so the VR review loads the
  // same elements you placed in the editor.

  private saveBridgeElements(data: SceneData): void {
    const kindMap: Record<string, string> = {
      camera:      "camera",
      light:       "light",
      cast_mark:   "castMark",
      crew:        "crew",
      equipment:   "equipment",
      props:       "setDressing",
      set_dressing:"setDressing",
      gltf:        "setDressing",
    };
    const assetMap: Record<string, string> = {
      camera:      "asset-camera",
      light:       "asset-light",
      cast_mark:   "asset-cast-mark",
      crew:        "asset-crew",
      equipment:   "asset-equipment",
      props:       "asset-equipment",
      set_dressing:"asset-equipment",
    };

    const bundleElements = data.elements.map((el) => {
      const kind = kindMap[el.type] ?? el.type;
      const p = el.properties;

      let properties: Record<string, unknown>;
      switch (el.type) {
        case "camera":
          properties = {
            focalLengthMm: p.focalLength ?? 35,
            fovDeg: Math.round(
              (2 * Math.atan(24 / (2 * Number(p.focalLength ?? 35))) * 180) / Math.PI
            ),
            rangeMeters: p.fovDistance ?? 4,
          };
          break;
        case "light":
          properties = {
            spreadDeg: p.coneAngle ?? 40,
            rangeMeters: p.coneDistance ?? 3,
            colorTemperatureKelvin: p.colorTemp ?? 5600,
          };
          break;
        case "cast_mark":
          properties = { characterName: p.actorName ?? el.name };
          break;
        case "crew":
          properties = { role: p.department ?? "Camera" };
          break;
        case "equipment":
          properties = { clearanceRadiusMeters: 1.0 };
          break;
        default:
          properties = { clearanceRadiusMeters: 1.0 };
      }

      return {
        id: el.id,
        kind,
        assetId: assetMap[el.type] ?? "asset-equipment",
        label: el.name,
        transform: {
          position: el.position,
          rotation: [0, el.rotationY, 0],
          scale: el.scale ?? [1, 1, 1],
        },
        properties,
      };
    });

    localStorage.setItem(
      `shot-caller:elements:${this.sceneId}`,
      JSON.stringify(bundleElements)
    );
  }

  // ── Export helpers ─────────────────────────────────────────────────────────

  exportJSON(): void {
    const json = JSON.stringify(this.toJSON(), null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `shot-caller-scene-${this.sceneId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
