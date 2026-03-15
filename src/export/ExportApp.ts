/**
 * ExportApp — Professional report generation and export
 * Main application for Part 3: Generate styled reports with screenshots
 */

import * as THREE from "three";
import type { SceneBundle } from "../contracts/stageReview.js";
import { loadSceneBundle } from "../data/sceneStore.js";
import {
  captureMultipleShots,
  captureBirdsEye,
  type CameraShot,
} from "./ScreenshotCapture.js";
import {
  generateHTMLReport,
  downloadReport,
  type ReportData,
  type ShotInfo,
  type ElementInfo,
} from "./ReportGenerator.js";

export class ExportApp {
  private sceneId: string;
  private bundle: SceneBundle | null = null;
  private scene: THREE.Scene | null = null;
  private renderer: THREE.WebGLRenderer | null = null;

  // DOM refs
  private statusEl!: HTMLElement;
  private progressEl!: HTMLElement;
  private progressFill!: HTMLElement;
  private errorEl!: HTMLElement;
  private generateBtn!: HTMLButtonElement;
  private previewBtn!: HTMLButtonElement;
  private downloadBtn!: HTMLButtonElement;
  private reportPreview!: HTMLIFrameElement;

  private generatedHTML: string | null = null;

  constructor(sceneId: string) {
    this.sceneId = sceneId;
  }

  async start(): Promise<void> {
    this.bindElements();
    this.bindEvents();

    await this.loadScene();
  }

  private bindElements(): void {
    this.statusEl = document.getElementById("export-status")!;
    this.progressEl = document.getElementById("export-progress")!;
    this.progressFill = document.getElementById("export-progress-fill")!;
    this.errorEl = document.getElementById("export-error")!;
    this.generateBtn = document.getElementById("export-generate-btn") as HTMLButtonElement;
    this.previewBtn = document.getElementById("export-preview-btn") as HTMLButtonElement;
    this.downloadBtn = document.getElementById("export-download-btn") as HTMLButtonElement;
    this.reportPreview = document.getElementById("export-preview-iframe") as HTMLIFrameElement;
  }

  private bindEvents(): void {
    this.generateBtn.addEventListener("click", () => this.handleGenerate());
    this.previewBtn.addEventListener("click", () => this.handlePreview());
    this.downloadBtn.addEventListener("click", () => this.handleDownload());
  }

  private async loadScene(): Promise<void> {
    try {
      this.showStatus("Loading scene...");

      // Load scene bundle
      this.bundle = await loadSceneBundle(this.sceneId);

      // Create THREE.js scene for screenshot capture
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x1a1a1a);

      // Add basic lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      this.scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
      directionalLight.position.set(5, 10, 7.5);
      this.scene.add(directionalLight);

      // Create cameras from scene elements
      this.createCamerasFromElements();

      // Create offscreen renderer for screenshots
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      this.renderer.setSize(1920, 1080);
      this.renderer.setPixelRatio(2);

      this.hideStatus();
      this.generateBtn.disabled = false;

      console.log("✅ Scene loaded successfully");
    } catch (error) {
      this.showError("Failed to load scene: " + (error instanceof Error ? error.message : "Unknown error"));
      console.error("Scene load error:", error);
    }
  }

  private createCamerasFromElements(): void {
    if (!this.bundle || !this.scene) return;

    // Create THREE.js cameras for each camera element
    this.bundle.scene.elements
      .filter((el) => el.kind === "camera")
      .forEach((camEl) => {
        const props = camEl.properties as any;
        const camera = new THREE.PerspectiveCamera(
          props.fovDeg || 50,
          16 / 9,
          0.1,
          1000,
        );

        // Set position and rotation from transform
        camera.position.set(
          camEl.transform.position[0],
          camEl.transform.position[1],
          camEl.transform.position[2],
        );
        camera.rotation.set(
          camEl.transform.rotation[0],
          camEl.transform.rotation[1],
          camEl.transform.rotation[2],
        );

        // Store element ID for reference
        camera.userData.elementId = camEl.id;
        camera.userData.label = camEl.label;

        this.scene!.add(camera);
      });
  }

  private async handleGenerate(): Promise<void> {
    if (!this.bundle || !this.scene) {
      this.showError("Scene not loaded");
      return;
    }

    try {
      this.generateBtn.disabled = true;
      this.showStatus("Generating report...");
      this.showProgress(0);

      // Step 1: Capture screenshots (50% of progress)
      const screenshots = await this.captureScreenshots();
      this.showProgress(50);

      // Step 2: Generate bird's eye view (60%)
      const birdsEye = await this.captureBirdsEyeView();
      this.showProgress(60);

      // Step 3: Build report data (70%)
      const reportData = this.buildReportData(screenshots, birdsEye);
      this.showProgress(70);

      // Step 4: Generate HTML (90%)
      this.generatedHTML = generateHTMLReport(reportData);
      this.showProgress(90);

      // Step 5: Done (100%)
      this.showProgress(100);
      this.hideStatus();

      this.previewBtn.disabled = false;
      this.downloadBtn.disabled = false;

      console.log("✅ Report generated successfully");
    } catch (error) {
      this.showError("Failed to generate report: " + (error instanceof Error ? error.message : "Unknown error"));
      console.error("Report generation error:", error);
    } finally {
      this.generateBtn.disabled = false;
    }
  }

  private async captureScreenshots(): Promise<Map<string, string>> {
    if (!this.bundle || !this.scene) {
      throw new Error("Scene not initialized");
    }

    const cameraShots: CameraShot[] = [];

    // Get all camera elements from the bundle
    const cameraElements = this.bundle.scene.elements.filter((el) => el.kind === "camera");

    // Find the corresponding Three.js cameras in the scene
    for (const camEl of cameraElements) {
      const threeCamera = this.scene.children.find(
        (child) => child.userData.elementId === camEl.id && child instanceof THREE.Camera,
      ) as THREE.Camera | undefined;

      if (threeCamera) {
        cameraShots.push({
          camera: threeCamera,
          name: camEl.label,
          description: `Shot from ${camEl.label}`,
        });
      }
    }

    // Capture screenshots
    const screenshots = await captureMultipleShots(
      this.scene,
      cameraShots,
      { width: 1920, height: 1080, format: "image/jpeg", quality: 0.9 },
      (current, total) => {
        const progress = Math.round(10 + (current / total) * 40); // 10-50%
        this.showProgress(progress);
        this.showStatus(`Capturing screenshots... (${current}/${total})`);
      },
    );

    return screenshots;
  }

  private async captureBirdsEyeView(): Promise<string> {
    if (!this.bundle || !this.scene) {
      throw new Error("Scene not initialized");
    }

    // Calculate scene bounds
    const box = new THREE.Box3();
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        box.expandByObject(obj);
      }
    });

    const bounds = {
      min: box.min,
      max: box.max,
    };

    return captureBirdsEye(this.scene, bounds, { width: 1920, height: 1920 });
  }

  private buildReportData(screenshots: Map<string, string>, birdsEye: string): ReportData {
    if (!this.bundle) {
      throw new Error("Scene bundle not loaded");
    }

    const shots: ShotInfo[] = [];
    const elements: ElementInfo[] = [];

    // Build shot list
    const cameraElements = this.bundle.scene.elements
      .filter((el) => el.kind === "camera")
      .sort((a, b) => {
        const aNum = (a.properties as any).shotNumber || 999;
        const bNum = (b.properties as any).shotNumber || 999;
        return aNum - bNum;
      });

    cameraElements.forEach((camEl, index) => {
      const props = camEl.properties as any;
      shots.push({
        number: props.shotNumber || index + 1,
        cameraName: camEl.label,
        shotType: props.shotType || "Standard",
        lens: props.lens,
        movement: props.movement,
        notes: props.notes,
        position: {
          x: camEl.transform.position[0],
          y: camEl.transform.position[1],
          z: camEl.transform.position[2],
        },
        rotation: {
          x: camEl.transform.rotation[0],
          y: camEl.transform.rotation[1],
          z: camEl.transform.rotation[2],
        },
        screenshot: screenshots.get(camEl.label),
      });
    });

    // Build elements list
    this.bundle.scene.elements.forEach((el) => {
      if (el.kind !== "camera") {
        elements.push({
          type: el.kind,
          name: el.label,
          position: {
            x: el.transform.position[0],
            y: el.transform.position[1],
            z: el.transform.position[2],
          },
          notes: (el.properties as any).notes,
        });
      }
    });

    // Calculate metadata
    const metadata = {
      totalCameras: cameraElements.length,
      totalLights: this.bundle.scene.elements.filter((el) => el.kind === "light").length,
      totalCast: this.bundle.scene.elements.filter((el) => el.kind === "castMark").length,
      totalCrew: this.bundle.scene.elements.filter((el) => el.kind === "crew").length,
    };

    return {
      projectName: `Scene ${this.sceneId}`,
      sceneId: this.sceneId,
      generatedDate: new Date(),
      shots,
      elements,
      screenshots,
      birdsEyeView: birdsEye,
      metadata,
    };
  }

  private handlePreview(): void {
    if (!this.generatedHTML) {
      this.showError("Generate report first");
      return;
    }

    // Show preview in iframe
    const previewSection = document.getElementById("export-preview-section")!;
    previewSection.style.display = "block";

    const blob = new Blob([this.generatedHTML], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    this.reportPreview.src = url;

    // Scroll to preview
    previewSection.scrollIntoView({ behavior: "smooth" });
  }

  private handleDownload(): void {
    if (!this.generatedHTML || !this.bundle) {
      this.showError("Generate report first");
      return;
    }

    const filename = `scene-${this.sceneId}-report.html`;

    downloadReport(this.generatedHTML, filename);

    console.log(`✅ Report downloaded: ${filename}`);
  }

  // UI Helpers

  private showStatus(message: string): void {
    this.statusEl.textContent = message;
    this.statusEl.style.display = "block";
  }

  private hideStatus(): void {
    this.statusEl.style.display = "none";
  }

  private showProgress(percent: number): void {
    this.progressEl.style.display = "block";
    this.progressFill.style.width = `${Math.min(percent, 100)}%`;
  }

  private showError(message: string): void {
    this.errorEl.textContent = message;
    this.errorEl.style.display = "block";
  }
}

export async function startExport(sceneId: string): Promise<void> {
  const app = new ExportApp(sceneId);
  await app.start();
}
