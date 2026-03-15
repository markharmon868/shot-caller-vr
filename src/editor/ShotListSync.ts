/**
 * ShotListSync — Norman principle: Shared mental model
 * Bidirectional highlighting between shot list and 3D cameras
 */

import type { CameraElement } from "./elements/CameraElement.js";

export class ShotListSync {
  private shotListContainer: HTMLElement | null = null;
  private onCameraHover?: (cameraId: string | null) => void;
  private onCameraClick?: (cameraId: string) => void;

  constructor(
    shotListContainerId: string,
    callbacks: {
      onCameraHover?: (cameraId: string | null) => void;
      onCameraClick?: (cameraId: string) => void;
    } = {},
  ) {
    this.shotListContainer = document.getElementById(shotListContainerId);
    this.onCameraHover = callbacks.onCameraHover;
    this.onCameraClick = callbacks.onCameraClick;
  }

  /**
   * Render the shot list from camera elements
   */
  render(cameras: CameraElement[]): void {
    if (!this.shotListContainer) return;

    // Sort by shot number
    const sortedCameras = cameras
      .filter((cam) => cam.shotNumber !== undefined)
      .sort((a, b) => (a.shotNumber || 0) - (b.shotNumber || 0));

    if (sortedCameras.length === 0) {
      this.shotListContainer.innerHTML = `
        <p class="shot-list-empty">No shots sequenced yet. Select cameras and click "Sequence Mode" to build your shot list.</p>
      `;
      return;
    }

    this.shotListContainer.innerHTML = sortedCameras
      .map(
        (cam) => `
        <div class="shot-item" data-camera-id="${cam.id}">
          <span class="shot-num">${String(cam.shotNumber).padStart(2, "0")}</span>
          <span class="shot-label">${cam.name || `Camera ${cam.shotNumber}`}</span>
          <button class="shot-delete" data-camera-id="${cam.id}" title="Remove from sequence">✕</button>
        </div>
      `,
      )
      .join("");

    this.bindEvents();
  }

  /**
   * Bind hover and click events to shot items
   */
  private bindEvents(): void {
    if (!this.shotListContainer) return;

    const items = this.shotListContainer.querySelectorAll(".shot-item");

    items.forEach((item) => {
      const cameraId = (item as HTMLElement).dataset.cameraId;
      if (!cameraId) return;

      // Hover events
      item.addEventListener("mouseenter", () => {
        this.onCameraHover?.(cameraId);
        item.classList.add("list-hover");
      });

      item.addEventListener("mouseleave", () => {
        this.onCameraHover?.(null);
        item.classList.remove("list-hover");
      });

      // Click event
      item.addEventListener("click", (e) => {
        if ((e.target as HTMLElement).classList.contains("shot-delete")) {
          return; // Delete button has its own handler
        }
        this.onCameraClick?.(cameraId);
      });
    });

    // Delete button events
    const deleteButtons = this.shotListContainer.querySelectorAll(".shot-delete");
    deleteButtons.forEach((btn) => {
      const cameraId = (btn as HTMLElement).dataset.cameraId;
      if (!cameraId) return;

      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.handleDelete(cameraId);
      });
    });
  }

  /**
   * Handle delete button click
   */
  private handleDelete(cameraId: string): void {
    // Dispatch custom event for the editor to handle
    const event = new CustomEvent("shot-remove", {
      detail: { cameraId },
    });
    window.dispatchEvent(event);
  }

  /**
   * Highlight a specific shot in the list
   */
  highlightShot(cameraId: string | null): void {
    if (!this.shotListContainer) return;

    const items = this.shotListContainer.querySelectorAll(".shot-item");
    items.forEach((item) => {
      if ((item as HTMLElement).dataset.cameraId === cameraId) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });
  }

  /**
   * Clear all highlights
   */
  clearHighlights(): void {
    if (!this.shotListContainer) return;

    const items = this.shotListContainer.querySelectorAll(".shot-item");
    items.forEach((item) => {
      item.classList.remove("active", "list-hover");
    });
  }
}
