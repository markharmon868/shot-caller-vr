import * as THREE from "three";
import {
  EnvironmentType,
  LocomotionEnvironment,
  SessionMode,
  VisibilityState,
  World,
} from "@iwsdk/core";
import { SceneBundle, type ReviewPose } from "./contracts/stageReview.js";
import { ReviewSceneLoader } from "./gaussianSplatLoader.js";
import { createElementById } from "./editor/SceneState.js";
import type { ProductionElement } from "./editor/elements/ProductionElement.js";

const SCENE_STORAGE_KEY = "shot-caller-scene-demo";

/** Load editor elements from localStorage and add their groups to the scene */
function loadEditorElements(scene: THREE.Scene): ProductionElement[] {
  const raw = localStorage.getItem(SCENE_STORAGE_KEY);
  if (!raw) return [];
  try {
    const data = JSON.parse(raw) as { elements?: Array<{ id: string; type: string; name: string; position: [number, number, number]; rotationY: number; scale?: [number, number, number]; properties: Record<string, unknown> }> };
    const elements: ProductionElement[] = [];
    for (const ed of data.elements ?? []) {
      const el = createElementById(ed.id, ed.type, ed.name);
      el.setPosition(...ed.position);
      el.setRotationY(ed.rotationY);
      if (ed.scale) el.setScale(...ed.scale);
      for (const [k, v] of Object.entries(ed.properties)) el.setProperty(k, v);
      scene.add(el.group);
      elements.push(el);
    }
    return elements;
  } catch {
    return [];
  }
}

export class XrReviewApp {
  private readonly world: World;
  private readonly loader: ReviewSceneLoader;
  private readonly elements: ProductionElement[];
  private frameId = 0;

  private constructor(world: World, loader: ReviewSceneLoader, elements: ProductionElement[]) {
    this.world = world;
    this.loader = loader;
    this.elements = elements;
    window.addEventListener("resize", this.handleResize);
  }

  static async create(
    container: HTMLDivElement,
    bundle: SceneBundle,
  ): Promise<XrReviewApp> {
    const world = await World.create(container, {
      assets: {},
      xr: {
        sessionMode: SessionMode.ImmersiveVR,
        offer: "none",
        features: {
          handTracking: true,
          layers: true,
        },
      },
      render: {
        defaultLighting: false,
      },
      features: {
        locomotion: true,
        grabbing: false,
        physics: false,
        sceneUnderstanding: false,
      },
    });

    world.scene.background = new THREE.Color(0x020617);
    world.camera.position.set(0, 1.6, 0);
    world.scene.add(new THREE.AmbientLight(0xffffff, 1.25));

    // Load splat + collider only — pass empty elements so no proxy wireframes spawn
    const loader = new ReviewSceneLoader({
      renderer: world.renderer,
      scene: world.scene,
      camera: world.camera,
    });
    await loader.load({ ...bundle, scene: { ...bundle.scene, elements: [], reviewIssues: [] } });

    const collider = loader.getCollider();
    if (collider) {
      const surfaces = collectLocomotionSurfaces(collider);
      for (const surface of surfaces) {
        world
          .createTransformEntity(surface)
          .addComponent(LocomotionEnvironment, { type: EnvironmentType.STATIC });
      }
    }

    // Add editor elements (same meshes as the desktop editor)
    const elements = loadEditorElements(world.scene);

    const app = new XrReviewApp(world, loader, elements);
    app.bindVisibility();
    app.tick();
    return app;
  }

  private bindVisibility(): void {
    this.world.visibilityState.subscribe((state) => {
      if (state !== VisibilityState.NonImmersive) {
        void this.loader.replayAnimation();
      }
    });
  }

  private readonly handleResize = () => {
    const parent = this.world.renderer.domElement.parentElement;
    if (!parent) return;
    this.world.renderer.setSize(parent.clientWidth, parent.clientHeight);
  };

  private tick = () => {
    this.loader.update();
    this.frameId = window.requestAnimationFrame(this.tick);
  };

  canEnterImmersive(): boolean {
    return Boolean(this.loader.getCollider());
  }

  getFocusedElementId(): string | null {
    return null;
  }

  getFocusedElementLabel(): string | null {
    return null;
  }

  getViewerPose(): ReviewPose {
    const cam = this.world.camera;
    return {
      position: [cam.position.x, cam.position.y, cam.position.z],
      rotation: [cam.rotation.x, cam.rotation.y, cam.rotation.z],
    };
  }

  syncIssues(): void {
    // no-op: XR mode reads issues dynamically
  }

  async enterOrExitXR(): Promise<void> {
    if (this.world.visibilityState.value === VisibilityState.NonImmersive) {
      await this.world.launchXR();
      return;
    }
    await this.world.exitXR();
  }

  dispose(): void {
    window.cancelAnimationFrame(this.frameId);
    window.removeEventListener("resize", this.handleResize);
    for (const el of this.elements) {
      this.world.scene.remove(el.group);
      el.dispose();
    }
    this.loader.dispose();
  }
}

function collectLocomotionSurfaces(root: THREE.Object3D): THREE.Object3D[] {
  if (root instanceof THREE.Mesh) {
    root.visible = false;
    return [root];
  }

  const surfaces: THREE.Object3D[] = [];
  root.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.visible = false;
      surfaces.push(child);
    }
  });
  return surfaces;
}
