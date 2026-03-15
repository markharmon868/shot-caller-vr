/**
 * StatusFeedback — Norman principle: System status must always be visible
 * Provides consistent feedback at every level
 */

import type { ToolType } from "./AssetPlacer.js";

export type AppMode = "idle" | "placing" | "sequence" | "review";

export interface AppState {
  mode: AppMode;
  selectedElement: string | null;
  selectedLabel: string | null;
  placingType: ToolType | null;
  isLoading: boolean;
  loadingProgress: number;
  loadingMessage: string;
}

export class StatusFeedback {
  private statusEl: HTMLElement | null = null;

  constructor(statusElementId: string) {
    this.statusEl = document.getElementById(statusElementId);
  }

  update(state: AppState): void {
    if (!this.statusEl) return;

    if (state.isLoading) {
      this.setLoading(state.loadingMessage);
      return;
    }

    switch (state.mode) {
      case "idle":
        if (state.selectedElement) {
          this.setSelected(state.selectedLabel || "Element");
        } else {
          this.setIdle();
        }
        break;
      case "placing":
        if (state.placingType) {
          this.setPlacing(state.placingType);
        }
        break;
      case "sequence":
        this.setSequenceMode();
        break;
      case "review":
        this.setReviewMode();
        break;
    }
  }

  setIdle(): void {
    if (!this.statusEl) return;
    this.statusEl.textContent = "Ready — Select a tool or element";
    this.statusEl.className = "status status-idle";
  }

  setPlacing(type: string): void {
    if (!this.statusEl) return;
    const typeLabel = this.formatType(type);
    this.statusEl.textContent = `Click in scene to place ${typeLabel} — Esc to cancel`;
    this.statusEl.className = "status status-placing";
  }

  setSelected(label: string): void {
    if (!this.statusEl) return;
    this.statusEl.textContent = `${label} selected — W/E/R to transform — Del to delete`;
    this.statusEl.className = "status status-selected";
  }

  setSequenceMode(): void {
    if (!this.statusEl) return;
    this.statusEl.textContent = "Sequence Mode — Click cameras in order to assign shot numbers";
    this.statusEl.className = "status status-sequence";
  }

  setReviewMode(): void {
    if (!this.statusEl) return;
    this.statusEl.textContent = "Review Mode — Space to advance — Esc to exit";
    this.statusEl.className = "status status-review";
  }

  setLoading(what: string): void {
    if (!this.statusEl) return;
    this.statusEl.textContent = `Loading ${what}...`;
    this.statusEl.className = "status status-loading";
  }

  setError(msg: string): void {
    if (!this.statusEl) return;
    this.statusEl.textContent = `⚠ ${msg}`;
    this.statusEl.className = "status status-error";
  }

  private formatType(type: string): string {
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }
}
