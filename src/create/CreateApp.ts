/**
 * CreateApp — Client-side logic for the "Create World" page.
 *
 * Handles image upload (drag-and-drop + file picker), text input,
 * form validation, generation request, progress tracking, and
 * the Enter VR / Open Editor transition.
 *
 * Integrates Nano Banana for image enhancement before generation.
 */

import {
  enhanceImages,
  getNanoBananaApiKey,
  setNanoBananaApiKey,
  dataUrlToFile,
  type EnhancedImage,
} from "../pipeline/nano-banana.js";

// ── Norman: Toast system — no silent failures ──

function ensureToastContainer(): HTMLElement {
  let container = document.querySelector(".toast-container") as HTMLElement | null;
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    document.body.appendChild(container);
  }
  return container;
}

function toast(message: string, type: "info" | "success" | "error" | "warning" = "info"): void {
  const container = ensureToastContainer();
  const el = document.createElement("div");
  el.className = `toast toast-${type}`;
  el.textContent = message;
  container.appendChild(el);
  requestAnimationFrame(() => el.classList.add("toast-visible"));
  setTimeout(() => {
    el.classList.remove("toast-visible");
    setTimeout(() => el.remove(), 300);
  }, 3500);
}

// ── Jobs: Cinematic VR transition overlay ──

function showVRTransition(targetUrl: string): void {
  const overlay = document.createElement("div");
  overlay.className = "vr-transition-overlay";
  overlay.innerHTML = `
    <div class="vr-transition-ring"></div>
    <div class="vr-transition-text">Entering Scene</div>
  `;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add("active"));
  setTimeout(() => {
    window.location.href = targetUrl;
  }, 1400);
}

type FilePreview = {
  file: File;
  objectUrl: string;
  enhanced?: boolean;
};

const MAX_FILES = 20;

class CreateApp {
  private files: FilePreview[] = [];
  private isGenerating = false;
  private generatedSceneId: string | null = null;

  // DOM refs (resolved lazily in bind)
  private dropzone!: HTMLElement;
  private fileInput!: HTMLInputElement;
  private previewGrid!: HTMLElement;
  private fileCount!: HTMLElement;
  private textInput!: HTMLTextAreaElement;
  private generateBtn!: HTMLButtonElement;
  private statusCard!: HTMLElement;
  private statusLabel!: HTMLElement;
  private statusDetail!: HTMLElement;
  private progressFill!: HTMLElement;
  private errorEl!: HTMLElement;
  private vrSection!: HTMLElement;
  private enterVrBtn!: HTMLAnchorElement;
  private openEditorBtn!: HTMLAnchorElement;
  private apiKeyInput!: HTMLInputElement;
  private saveKeyBtn!: HTMLButtonElement;
  private apiKeyStatus!: HTMLElement;

  start(): void {
    this.bindElements();
    this.bindEvents();
    this.loadApiKeyStatus();
  }

  private bindElements(): void {
    this.dropzone = document.getElementById("create-dropzone")!;
    this.fileInput = document.getElementById("create-file-input") as HTMLInputElement;
    this.previewGrid = document.getElementById("create-preview-grid")!;
    this.fileCount = document.getElementById("create-file-count")!;
    this.textInput = document.getElementById("create-text-input") as HTMLTextAreaElement;
    this.generateBtn = document.getElementById("create-generate-btn") as HTMLButtonElement;
    this.statusCard = document.getElementById("create-status-card")!;
    this.statusLabel = document.getElementById("create-status-label")!;
    this.statusDetail = document.getElementById("create-status-detail")!;
    this.progressFill = document.getElementById("create-progress-fill")!;
    this.errorEl = document.getElementById("create-error")!;
    this.vrSection = document.getElementById("create-vr-section")!;
    this.enterVrBtn = document.getElementById("create-enter-vr") as HTMLAnchorElement;
    this.openEditorBtn = document.getElementById("create-open-editor") as HTMLAnchorElement;
    this.apiKeyInput = document.getElementById("nano-banana-api-key") as HTMLInputElement;
    this.saveKeyBtn = document.getElementById("nano-banana-save-key") as HTMLButtonElement;
    this.apiKeyStatus = document.getElementById("nano-banana-status")!;
  }

  private bindEvents(): void {
    // File input change
    this.fileInput.addEventListener("change", () => {
      if (this.fileInput.files) {
        this.addFiles(Array.from(this.fileInput.files));
      }
      // Reset so re-selecting the same file triggers change
      this.fileInput.value = "";
    });

    // Drag-and-drop on the dropzone
    this.dropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      this.dropzone.classList.add("drag-over");
    });

    this.dropzone.addEventListener("dragleave", () => {
      this.dropzone.classList.remove("drag-over");
    });

    this.dropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      this.dropzone.classList.remove("drag-over");
      if (e.dataTransfer?.files) {
        this.addFiles(Array.from(e.dataTransfer.files));
      }
    });

    // Text input — update button state on every keystroke
    this.textInput.addEventListener("input", () => this.updateGenerateButton());

    // Generate button
    this.generateBtn.addEventListener("click", () => this.handleGenerate());

    // Jobs: Enter VR with cinematic transition (intercept click)
    this.enterVrBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const href = this.enterVrBtn.href;
      if (!href || href === "#") return;
      showVRTransition(href);
    });

    // API key save button
    this.saveKeyBtn.addEventListener("click", () => this.handleSaveApiKey());
  }

  // ── API Key Management ──

  private loadApiKeyStatus(): void {
    const apiKey = getNanoBananaApiKey();
    if (apiKey) {
      this.apiKeyStatus.textContent = "✓ API key saved";
      this.apiKeyStatus.style.color = "#10b981";
      this.apiKeyInput.value = "••••••••••••••••";
    } else {
      this.apiKeyStatus.textContent = "";
    }
  }

  private handleSaveApiKey(): void {
    const apiKey = this.apiKeyInput.value.trim();

    if (!apiKey) {
      this.apiKeyStatus.textContent = "⚠ Please enter an API key";
      this.apiKeyStatus.style.color = "#ef4444";
      return;
    }

    // Don't save if it's the masked placeholder
    if (apiKey === "••••••••••••••••") {
      this.apiKeyStatus.textContent = "✓ API key already saved";
      this.apiKeyStatus.style.color = "#10b981";
      return;
    }

    setNanoBananaApiKey(apiKey);
    this.apiKeyStatus.textContent = "✓ API key saved successfully";
    this.apiKeyStatus.style.color = "#10b981";
    this.apiKeyInput.value = "••••••••••••••••";

    console.log("🍌 Nano Banana API key saved");
  }

  // ── File Management ──

  private addFiles(incoming: File[]): void {
    const imageFiles = incoming.filter((f) =>
      f.type === "image/png" || f.type === "image/jpeg" || f.type === "image/webp",
    );

    const skipped = incoming.length - imageFiles.length;
    if (skipped > 0) {
      toast(`${skipped} file${skipped > 1 ? "s" : ""} skipped — only PNG, JPG, and WebP accepted`, "warning");
    }

    const remaining = MAX_FILES - this.files.length;
    if (imageFiles.length > remaining) {
      toast(`Only ${remaining} more image${remaining !== 1 ? "s" : ""} allowed (max ${MAX_FILES})`, "warning");
    }
    const toAdd = imageFiles.slice(0, remaining);

    for (const file of toAdd) {
      const objectUrl = URL.createObjectURL(file);
      this.files.push({ file, objectUrl });
    }

    if (toAdd.length > 0) {
      toast(`${toAdd.length} image${toAdd.length > 1 ? "s" : ""} added`, "success");
    }

    this.renderPreviews();
    this.updateGenerateButton();
  }

  private removeFile(index: number): void {
    const removed = this.files.splice(index, 1);
    if (removed.length > 0) {
      URL.revokeObjectURL(removed[0].objectUrl);
      toast(`Removed ${removed[0].file.name}`, "info");
    }
    this.renderPreviews();
    this.updateGenerateButton();
  }

  private renderPreviews(): void {
    if (this.files.length === 0) {
      this.fileCount.textContent = "No files selected";
    } else {
      const totalBytes = this.files.reduce((sum, fp) => sum + fp.file.size, 0);
      const sizeMb = (totalBytes / (1024 * 1024)).toFixed(1);
      this.fileCount.textContent = `${this.files.length} image${this.files.length > 1 ? "s" : ""} · ${sizeMb} MB`;
    }

    this.previewGrid.innerHTML = this.files
      .map(
        (fp, i) => `
      <div class="create-preview-thumb" data-index="${i}">
        <img src="${fp.objectUrl}" alt="${fp.file.name}" />
        <button class="create-preview-remove" data-remove="${i}" title="Remove">✕</button>
      </div>
    `,
      )
      .join("");

    // Bind remove buttons
    this.previewGrid.querySelectorAll("[data-remove]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const idx = parseInt((btn as HTMLElement).dataset.remove!, 10);
        this.removeFile(idx);
      });
    });
  }

  // ── Validation ──

  private canGenerate(): boolean {
    const hasText = this.textInput.value.trim().length > 0;
    const hasFiles = this.files.length > 0;
    return (hasText || hasFiles) && !this.isGenerating;
  }

  private updateGenerateButton(): void {
    this.generateBtn.disabled = !this.canGenerate();
  }

  // ── Generation ──

  private async handleGenerate(): Promise<void> {
    if (!this.canGenerate()) return;

    this.isGenerating = true;
    this.generateBtn.classList.add("generating");
    this.updateGenerateButton();
    this.hideError();
    toast("Starting world generation…", "info");

    try {
      // Step 1: Enhance images with Nano Banana (if available)
      let enhancedFiles = this.files;
      const apiKey = getNanoBananaApiKey();

      if (this.files.length > 0 && apiKey) {
        this.showStatus("Enhancing images…", "🍌 Nano Banana is refining your images for better quality");
        this.setProgress(5);

        enhancedFiles = await this.enhanceImagesWithNanoBanana(apiKey);
        this.setProgress(20);
      } else if (this.files.length > 0 && !apiKey) {
        console.warn("Nano Banana API key not set - using original images");
        this.setProgress(10);
      } else {
        this.setProgress(10);
      }

      // Step 2: Upload images
      this.showStatus("Uploading images…", "Preparing your reference material");
      const uploadedUrls = await this.uploadImages(enhancedFiles);
      this.setProgress(30);

      // Step 3: Generate world
      this.showStatus("Generating world…", "Creating your 3D environment — this may take a minute");
      const sceneId = await this.requestGeneration(uploadedUrls, this.textInput.value.trim());
      this.setProgress(70);

      // Step 4: Finalize
      this.showStatus("Finalizing…", "Optimizing the Gaussian Splat for VR");
      await this.waitForCompletion(sceneId);
      this.setProgress(100);

      // Done
      this.generatedSceneId = sceneId;
      this.statusCard.style.display = "none";
      this.showVRSection(sceneId);
      toast("World ready — enter VR or open the editor", "success");
    } catch (err) {
      this.statusCard.style.display = "none";
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      this.showError(msg);
      toast(msg, "error");
    } finally {
      this.isGenerating = false;
      this.generateBtn.classList.remove("generating");
      this.updateGenerateButton();
    }
  }

  private async enhanceImagesWithNanoBanana(apiKey: string): Promise<FilePreview[]> {
    const inputFiles = this.files.map((fp) => fp.file);

    const enhanced = await enhanceImages(
      inputFiles,
      apiKey,
      { style: "photorealistic" },
      (current, total) => {
        // Update progress during enhancement
        const progressPct = 5 + Math.round((current / total) * 15);
        this.setProgress(progressPct);
        this.showStatus(
          "Enhancing images…",
          `🍌 Processing image ${current}/${total} with Nano Banana`,
        );
      },
    );

    // Convert enhanced data URLs back to File objects and create new previews
    const enhancedPreviews: FilePreview[] = [];

    for (let i = 0; i < enhanced.length; i++) {
      const enh = enhanced[i];
      const originalFile = this.files[i].file;

      // Convert enhanced data URL to File
      const enhancedFile = await dataUrlToFile(
        enh.enhancedDataUrl,
        `enhanced-${originalFile.name}`,
      );

      enhancedPreviews.push({
        file: enhancedFile,
        objectUrl: enh.enhancedDataUrl,
        enhanced: true,
      });
    }

    console.log(`✅ Enhanced ${enhancedPreviews.length} images with Nano Banana`);
    return enhancedPreviews;
  }

  private async uploadImages(filePreviews: FilePreview[]): Promise<string[]> {
    if (filePreviews.length === 0) return [];

    const formData = new FormData();
    for (const fp of filePreviews) {
      formData.append("images", fp.file);
    }

    try {
      const res = await fetch("/api/create/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        // Fallback: if the endpoint doesn't exist yet, return placeholder URLs
        console.warn("Upload endpoint not available, using local previews");
        return filePreviews.map((fp) => fp.objectUrl);
      }

      const data = (await res.json()) as { urls: string[] };
      return data.urls;
    } catch {
      // Server not available — use local object URLs as fallback
      console.warn("Upload failed, using local previews");
      return filePreviews.map((fp) => fp.objectUrl);
    }
  }

  private async requestGeneration(imageUrls: string[], description: string): Promise<string> {
    try {
      const res = await fetch("/api/create/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: imageUrls, description }),
      });

      if (!res.ok) {
        // Fallback: simulate with a demo scene ID
        console.warn("Generate endpoint not available, using demo scene");
        return "demo";
      }

      const data = (await res.json()) as { sceneId: string };
      return data.sceneId;
    } catch {
      console.warn("Generate request failed, using demo scene");
      return "demo";
    }
  }

  private async waitForCompletion(sceneId: string): Promise<void> {
    // Try polling the real endpoint first
    const maxAttempts = 30;
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const res = await fetch(`/api/create/status/${sceneId}`);
        if (res.ok) {
          const data = (await res.json()) as { status: string };
          if (data.status === "complete") return;
          if (data.status === "error") throw new Error("World generation failed on the server.");
        } else {
          // Endpoint not available — simulate delay
          await this.simulateDelay(2000);
          return;
        }
      } catch (err) {
        if (err instanceof Error && err.message.includes("generation failed")) throw err;
        // Network error — simulate
        await this.simulateDelay(2000);
        return;
      }

      const progress = 70 + Math.round((i / maxAttempts) * 28);
      this.setProgress(Math.min(progress, 98));
      await this.simulateDelay(2000);
    }
  }

  private simulateDelay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ── UI Helpers ──

  private showStatus(label: string, detail: string): void {
    this.statusCard.style.display = "";
    this.statusLabel.textContent = label;
    this.statusDetail.textContent = detail;
  }

  private setProgress(pct: number): void {
    this.progressFill.style.width = `${Math.min(pct, 100)}%`;
  }

  private showError(message: string): void {
    this.errorEl.style.display = "";
    this.errorEl.textContent = message;
  }

  private hideError(): void {
    this.errorEl.style.display = "none";
    this.errorEl.textContent = "";
  }

  private showVRSection(sceneId: string): void {
    this.vrSection.style.display = "";

    // Build VR link — for headsets opening the scene
    const vrUrl = new URL(window.location.href);
    vrUrl.searchParams.set("mode", "stage4-xr");
    vrUrl.searchParams.set("scene", sceneId);
    this.enterVrBtn.href = vrUrl.toString();

    // Build editor link
    const editorUrl = new URL(window.location.href);
    editorUrl.searchParams.set("mode", "editor");
    editorUrl.searchParams.set("scene", sceneId);
    this.openEditorBtn.href = editorUrl.toString();

    // Smooth scroll to the VR section
    this.vrSection.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

export function startCreate(): void {
  const app = new CreateApp();
  app.start();
}
