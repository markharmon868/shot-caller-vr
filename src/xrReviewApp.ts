import * as THREE from "three";
import {
  EnvironmentType,
  Interactable,
  LocomotionEnvironment,
  PanelUI,
  SessionMode,
  VisibilityState,
  World,
} from "@iwsdk/core";
import { SceneBundle } from "./contracts/stageReview.js";
import { ReviewSceneLoader } from "./gaussianSplatLoader.js";
import { PanelSystem } from "./uiPanel.js";
import { reviewBridge } from "./reviewBridge.js";

export class XrReviewApp {
  private readonly world: World;
  private readonly bundle: SceneBundle;
  private readonly loader: ReviewSceneLoader;
  private frameId = 0;

  private constructor(world: World, bundle: SceneBundle, loader: ReviewSceneLoader) {
    this.world = world;
    this.bundle = bundle;
    this.loader = loader;
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
    world.registerSystem(PanelSystem);

    const loader = new ReviewSceneLoader({
      renderer: world.renderer,
      scene: world.scene,
      camera: world.camera,
    });
    await loader.load(bundle);

    const collider = loader.getCollider();
    if (collider) {
      const surfaces = collectLocomotionSurfaces(collider);
      for (const surface of surfaces) {
        world
          .createTransformEntity(surface)
          .addComponent(LocomotionEnvironment, { type: EnvironmentType.STATIC });
      }
    }

    const panelEntity = world
      .createTransformEntity()
      .addComponent(PanelUI, {
        config: "./ui/review-hud.json",
        maxHeight: 0.85,
        maxWidth: 1.45,
      })
      .addComponent(Interactable);
    panelEntity.object3D?.position.set(0.85, 1.45, -1.4);

    const app = new XrReviewApp(world, bundle, loader);
    app.bindVisibility();
    app.tick();
    return app;
  }

  private bindVisibility(): void {
    this.world.visibilityState.subscribe((state) => {
      reviewBridge.setState({
        xrActive: state !== VisibilityState.NonImmersive,
        error: null,
      });
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
    const direction = new THREE.Vector3();
    this.world.camera.getWorldDirection(direction);
    this.loader.updateFocusFromRay(this.world.camera.position, direction);
    reviewBridge.setState({
      selectedLabel: this.loader.getFocusedElement()?.label ?? null,
    });
    this.frameId = window.requestAnimationFrame(this.tick);
  };

  canEnterImmersive(): boolean {
    return Boolean(this.loader.getCollider());
  }

  async enterOrExitXR(): Promise<void> {
    if (this.world.visibilityState.value === VisibilityState.NonImmersive) {
      await this.world.launchXR();
      return;
    }
    await this.world.exitXR();
  }

  getFocusedElementLabel(): string | null {
    return this.loader.getFocusedElement()?.label ?? null;
  }

  getFocusedElementId(): string | null {
    return this.loader.getFocusedElement()?.id ?? null;
  }

  getViewerPose(): { position: [number, number, number]; rotation: [number, number, number] } {
    const position = this.world.camera.position;
    const rotation = this.world.camera.rotation;
    return {
      position: [position.x, position.y, position.z],
      rotation: [rotation.x, rotation.y, rotation.z],
    };
  }

  syncIssues(): void {
    this.loader.syncIssues(this.bundle.scene.reviewIssues);
  }

  dispose(): void {
    window.cancelAnimationFrame(this.frameId);
    window.removeEventListener("resize", this.handleResize);
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
