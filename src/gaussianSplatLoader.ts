import { SparkRenderer, SplatMesh } from "@sparkjsdev/spark";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  AssetCatalogEntry,
  ReviewIssue,
  SceneBundle,
  SceneElement,
  WorldBounds,
} from "./contracts/stageReview.js";
import { GaussianSplatAnimator } from "./gaussianSplatAnimator.js";

const LOAD_TIMEOUT_MS = 30_000;

interface SceneNode {
  asset: AssetCatalogEntry;
  element: SceneElement;
  root: THREE.Object3D;
  highlight: THREE.BoxHelper;
}

function createBuiltinFloorCollider(_bounds: WorldBounds): THREE.Mesh {
  const collider = new THREE.Mesh(
    new THREE.PlaneGeometry(10_000, 10_000),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  collider.name = "builtin-floor-collider";
  collider.rotation.x = -Math.PI / 2;
  collider.position.set(
    0,
    0,
    0,
  );
  return collider;
}

function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  return Promise.race<T>([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(
        () => reject(new Error(`${label} timed out after ${LOAD_TIMEOUT_MS / 1000}s.`)),
        LOAD_TIMEOUT_MS,
      );
    }),
  ]);
}

function createLabelSprite(text: string, color: string): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 96;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Failed to create label canvas context.");
  }
  context.fillStyle = "rgba(15, 23, 42, 0.9)";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = color;
  context.lineWidth = 4;
  context.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
  context.fillStyle = "#f8fafc";
  context.font = "bold 26px Arial";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(1.6, 0.6, 1);
  return sprite;
}

function createFootprintOutline(width: number, depth: number, color: string): THREE.Line {
  const points = [
    new THREE.Vector3(-width / 2, 0.02, -depth / 2),
    new THREE.Vector3(width / 2, 0.02, -depth / 2),
    new THREE.Vector3(width / 2, 0.02, depth / 2),
    new THREE.Vector3(-width / 2, 0.02, depth / 2),
    new THREE.Vector3(-width / 2, 0.02, -depth / 2),
  ];
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color });
  return new THREE.Line(geometry, material);
}

function createConeHelper(
  height: number,
  radius: number,
  color: string,
  transparent = true,
): THREE.Mesh {
  const geometry = new THREE.ConeGeometry(radius, height, 24, 1, true);
  geometry.translate(0, -height / 2, 0);
  const material = new THREE.MeshBasicMaterial({
    color,
    wireframe: true,
    transparent,
    opacity: 0.45,
  });
  return new THREE.Mesh(geometry, material);
}

function createProxyMesh(asset: AssetCatalogEntry, element: SceneElement): THREE.Object3D {
  const group = new THREE.Group();
  const color = new THREE.Color(asset.helper.color);
  let mesh: THREE.Object3D;

  switch (element.kind) {
    case "camera": {
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.45, 0.28, 0.25),
        new THREE.MeshStandardMaterial({ color }),
      );
      const lens = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 0.22, 24),
        new THREE.MeshStandardMaterial({ color: color.clone().offsetHSL(0, 0, 0.15) }),
      );
      lens.rotation.z = Math.PI / 2;
      lens.position.set(0.28, 0, 0);
      mesh = new THREE.Group();
      mesh.add(body, lens);
      break;
    }
    case "light":
      mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.42, 0.12),
        new THREE.MeshStandardMaterial({ color }),
      );
      break;
    case "crew":
      mesh = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.18, 1.1, 8, 16),
        new THREE.MeshStandardMaterial({ color }),
      );
      break;
    case "castMark":
      mesh = new THREE.Mesh(
        new THREE.TorusGeometry(0.18, 0.03, 8, 24),
        new THREE.MeshStandardMaterial({ color }),
      );
      mesh.rotation.x = Math.PI / 2;
      break;
    case "equipment":
      mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1.0, 0.4, 0.6),
        new THREE.MeshStandardMaterial({ color }),
      );
      break;
    case "setDressing":
      mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 0.65, 0.75),
        new THREE.MeshStandardMaterial({ color }),
      );
      break;
  }

  group.add(mesh);
  const label = createLabelSprite(element.label, asset.helper.color);
  label.position.set(0, asset.helper.heightMeters + 0.6, 0);
  group.add(label);
  group.add(
    createFootprintOutline(
      asset.helper.footprintMeters[0],
      asset.helper.footprintMeters[1],
      asset.helper.color,
    ),
  );

  if (element.kind === "camera") {
    const height = asset.helper.frustum?.rangeMeters ?? 2.4;
    const radius =
      Math.tan(THREE.MathUtils.degToRad((asset.helper.frustum?.fovDeg ?? 50) / 2)) * height;
    const frustum = createConeHelper(height, radius, asset.helper.color);
    frustum.rotation.z = -Math.PI / 2;
    frustum.position.x = height / 2;
    group.add(frustum);
  }

  if (element.kind === "light") {
    const height = asset.helper.cone?.rangeMeters ?? 2;
    const radius =
      Math.tan(THREE.MathUtils.degToRad((asset.helper.cone?.angleDeg ?? 45) / 2)) * height;
    const lightCone = createConeHelper(height, radius, asset.helper.color);
    lightCone.position.y = -0.4;
    group.add(lightCone);
  }

  group.traverse((child) => {
    child.userData.elementId = element.id;
  });
  return group;
}

function setTransform(target: THREE.Object3D, element: SceneElement, asset: AssetCatalogEntry): void {
  target.position.set(...element.transform.position);
  target.rotation.set(...element.transform.rotation);
  target.scale.set(...element.transform.scale);
  target.scale.multiply(new THREE.Vector3(...asset.defaultScale));
}

function patchCameraClone(camera: THREE.Camera): void {
  if (!(camera instanceof THREE.PerspectiveCamera)) return;
  camera.clone = function () {
    const clone = new THREE.PerspectiveCamera();
    clone.projectionMatrix.copy(this.projectionMatrix);
    clone.projectionMatrixInverse.copy(this.projectionMatrixInverse);
    clone.matrixWorld.copy(this.matrixWorld);
    clone.matrixWorldInverse.copy(this.matrixWorldInverse);
    return clone;
  };
}

function createIssueMarker(issue: ReviewIssue): THREE.Object3D {
  const group = new THREE.Group();
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 16, 16),
    new THREE.MeshBasicMaterial({ color: issue.status === "open" ? 0xef4444 : 0x22c55e }),
  );
  sphere.position.set(...issue.reviewPose.position);
  group.add(sphere);
  const label = createLabelSprite(issue.note.slice(0, 32), "#ef4444");
  label.position.copy(sphere.position).add(new THREE.Vector3(0, 0.45, 0));
  group.add(label);
  return group;
}

function createBoundsCamera(bounds: WorldBounds): THREE.OrthographicCamera {
  const width = bounds.max[0] - bounds.min[0];
  const depth = bounds.max[2] - bounds.min[2];
  const centerX = (bounds.min[0] + bounds.max[0]) / 2;
  const centerZ = (bounds.min[2] + bounds.max[2]) / 2;
  const halfSpan = Math.max(width, depth) * 0.65;
  const camera = new THREE.OrthographicCamera(
    -halfSpan,
    halfSpan,
    halfSpan,
    -halfSpan,
    0.1,
    100,
  );
  camera.position.set(centerX, bounds.max[1] + 10, centerZ);
  camera.lookAt(centerX, 0, centerZ);
  return camera;
}

export class ReviewSceneLoader {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.Camera;
  private readonly gltfLoader = new GLTFLoader();
  private sparkRenderer: SparkRenderer | null = null;
  private splat: SplatMesh | null = null;
  private splatAnimator: GaussianSplatAnimator | null = null;
  private collider: THREE.Object3D | null = null;
  private readonly root = new THREE.Group();
  private readonly issueRoot = new THREE.Group();
  private readonly nodes = new Map<string, SceneNode>();
  private focusId: string | null = null;

  constructor(params: {
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.Camera;
  }) {
    this.renderer = params.renderer;
    this.scene = params.scene;
    this.camera = params.camera;

    this.root.name = "review-scene-root";
    this.issueRoot.name = "review-issue-root";
    this.scene.add(this.root);
    this.scene.add(this.issueRoot);
    patchCameraClone(this.camera);
  }

  private ensureSparkRenderer(): SparkRenderer {
    if (this.sparkRenderer) return this.sparkRenderer;
    const spark = new SparkRenderer({
      renderer: this.renderer,
      enableLod: true,
      lodSplatScale: 1.0,
      behindFoveate: 0.1,
    });
    spark.outsideFoveate = 0.3;
    spark.renderOrder = -10;
    this.scene.add(spark);
    this.sparkRenderer = spark;
    return spark;
  }

  async load(bundle: SceneBundle): Promise<void> {
    this.disposeContent();

    this.ensureSparkRenderer();
    this.splat = new SplatMesh({
      url: bundle.world.splatUrl,
      lod: true,
    });
    await withTimeout(this.splat.initialized, `Splat ${bundle.world.splatUrl}`);
    this.splat.renderOrder = -10;

    // World Labs splats use OpenCV coords (Y-down) — flip to Three.js (Y-up)
    if (!bundle.world.splatUrl.includes("sensai")) {
      this.splat.rotation.x = Math.PI;
      this.splat.position.y = 2.887;
    }

    this.root.add(this.splat);

    this.splatAnimator = new GaussianSplatAnimator(this.splat);
    this.splatAnimator.apply();
    this.splatAnimator.setProgress(1);

    if (bundle.world.colliderUrl.startsWith("builtin://floor")) {
      this.collider = createBuiltinFloorCollider(bundle.world.worldBounds);
      this.root.add(this.collider);
    } else if (bundle.world.colliderUrl) {
      const colliderScene = await withTimeout(
        this.gltfLoader.loadAsync(bundle.world.colliderUrl),
        `Collider ${bundle.world.colliderUrl}`,
      );
      this.collider = colliderScene.scene;
      this.collider.visible = false;
      this.root.add(this.collider);
    }

    for (const element of bundle.scene.elements) {
      const asset = bundle.assets.assets.find((entry) => entry.id === element.assetId);
      if (!asset) {
        throw new Error(`Missing asset catalog entry for element ${element.id}.`);
      }

      const root = asset.gltfUrl
        ? (await withTimeout(this.gltfLoader.loadAsync(asset.gltfUrl), asset.gltfUrl)).scene
        : createProxyMesh(asset, element);

      setTransform(root, element, asset);
      this.root.add(root);

      const highlight = new THREE.BoxHelper(root, 0xffffff);
      highlight.visible = false;
      this.root.add(highlight);

      root.traverse((child) => {
        child.userData.elementId = element.id;
      });
      this.nodes.set(element.id, {
        asset,
        element,
        root,
        highlight,
      });
    }

    this.syncIssues(bundle.scene.reviewIssues);
  }

  update(): void {
    if (this.splatAnimator?.isAnimating) {
      this.splatAnimator.tick();
    }
  }

  syncIssues(reviewIssues: ReviewIssue[]): void {
    this.issueRoot.clear();
    for (const issue of reviewIssues) {
      this.issueRoot.add(createIssueMarker(issue));
    }
  }

  setFocusedElement(elementId: string | null): void {
    this.focusId = elementId;
    for (const [nodeId, node] of this.nodes) {
      node.highlight.visible = nodeId === elementId;
      if (node.highlight.visible) {
        node.highlight.update();
      }
    }
  }

  updateFocusFromRay(origin: THREE.Vector3, direction: THREE.Vector3): string | null {
    const raycaster = new THREE.Raycaster(origin, direction.normalize(), 0.05, 20);
    raycaster.camera = this.camera;
    const intersections = raycaster.intersectObjects(
      [...this.nodes.values()].map((node) => node.root),
      true,
    );
    const hit = intersections.find((entry) => entry.object.userData.elementId);
    const elementId = hit?.object.userData.elementId ?? null;
    this.setFocusedElement(elementId);
    return elementId;
  }

  getFocusedElement(): SceneElement | null {
    if (!this.focusId) return null;
    return this.nodes.get(this.focusId)?.element ?? null;
  }

  getCollider(): THREE.Object3D | null {
    return this.collider;
  }

  async replayAnimation(): Promise<void> {
    if (!this.splatAnimator) return;
    this.splatAnimator.stop();
    this.splatAnimator.setProgress(0);
    await this.splatAnimator.animateIn();
  }

  captureTopDown(bounds: WorldBounds): string {
    const previousTarget = this.renderer.getRenderTarget();
    const previousXrEnabled = this.renderer.xr.enabled;
    this.renderer.xr.enabled = false;

    const captureCamera = createBoundsCamera(bounds);
    this.renderer.render(this.scene, captureCamera);
    const dataUrl = this.renderer.domElement.toDataURL("image/png");

    this.renderer.setRenderTarget(previousTarget);
    this.renderer.xr.enabled = previousXrEnabled;
    return dataUrl;
  }

  dispose(): void {
    this.disposeContent();
    if (this.sparkRenderer) {
      this.scene.remove(this.sparkRenderer);
      this.sparkRenderer = null;
    }
    this.scene.remove(this.root);
    this.scene.remove(this.issueRoot);
  }

  private disposeContent(): void {
    this.focusId = null;
    this.nodes.forEach((node) => {
      node.highlight.geometry.dispose();
      (node.highlight.material as THREE.Material).dispose();
      node.root.parent?.remove(node.root);
      node.root.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        child.geometry.dispose();
        const materials = Array.isArray(child.material)
          ? child.material
          : [child.material];
        for (const material of materials) {
          material.dispose();
        }
      });
    });
    this.nodes.clear();
    this.issueRoot.clear();

    if (this.collider) {
      this.collider.parent?.remove(this.collider);
      this.collider.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        child.geometry.dispose();
        const materials = Array.isArray(child.material)
          ? child.material
          : [child.material];
        for (const material of materials) {
          material.dispose();
        }
      });
      this.collider = null;
    }

    if (this.splatAnimator) {
      this.splatAnimator.dispose();
      this.splatAnimator = null;
    }
    if (this.splat) {
      this.splat.parent?.remove(this.splat);
      this.splat.dispose();
      this.splat = null;
    }
  }
}
