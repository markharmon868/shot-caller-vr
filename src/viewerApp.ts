import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { SceneBundle } from "./contracts/stageReview.js";
import { ReviewSceneLoader } from "./gaussianSplatLoader.js";
import { reviewBridge } from "./reviewBridge.js";

export class ViewerApp {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly controls: OrbitControls;
  private readonly loader: ReviewSceneLoader;
  private readonly bundle: SceneBundle;
  private frameId = 0;

  private constructor(container: HTMLDivElement, bundle: SceneBundle) {
    this.bundle = bundle;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x020617);
    this.scene.add(new THREE.AmbientLight(0xffffff, 1.2));

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
    keyLight.position.set(4, 8, 3);
    this.scene.add(keyLight);

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      200,
    );
    this.camera.position.set(0, 2.2, 5.5);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.innerHTML = "";
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 1.2, 0);
    this.controls.enableDamping = true;

    this.loader = new ReviewSceneLoader({
      renderer: this.renderer,
      scene: this.scene,
      camera: this.camera,
    });

    window.addEventListener("resize", this.handleResize);
  }

  static async create(
    container: HTMLDivElement,
    bundle: SceneBundle,
  ): Promise<ViewerApp> {
    const app = new ViewerApp(container, bundle);
    await app.loader.load(bundle);
    app.tick();
    return app;
  }

  private readonly handleResize = () => {
    const width = this.renderer.domElement.parentElement?.clientWidth ?? window.innerWidth;
    const height = this.renderer.domElement.parentElement?.clientHeight ?? window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private tick = () => {
    this.controls.update();
    this.loader.update();

    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    this.loader.updateFocusFromRay(this.camera.position, direction);
    reviewBridge.setState({
      selectedLabel: this.loader.getFocusedElement()?.label ?? null,
    });

    this.renderer.render(this.scene, this.camera);
    this.frameId = window.requestAnimationFrame(this.tick);
  };

  updateIssues(): void {
    this.loader.syncIssues(this.bundle.scene.reviewIssues);
  }

  captureTopDown(): string {
    return this.loader.captureTopDown(this.bundle.world.worldBounds);
  }

  dispose(): void {
    window.cancelAnimationFrame(this.frameId);
    window.removeEventListener("resize", this.handleResize);
    this.controls.dispose();
    this.loader.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
