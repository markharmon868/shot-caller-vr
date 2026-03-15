/**
 * KeyboardShortcuts — Systrom principle: Fast path to core action
 * Global keyboard shortcuts for common editor actions
 */

import type { ToolType } from "./AssetPlacer.js";

export interface ShortcutHandlers {
  onUndo?: () => void;
  onRedo?: () => void;
  onDelete?: () => void;
  onSave?: () => void;
  onPlaceElement?: (type: ToolType) => void;
  onGizmoMode?: (mode: "translate" | "rotate" | "scale") => void;
  onEscape?: () => void;
  onToggleSequenceMode?: () => void;
  onToggleReviewMode?: () => void;
}

export class KeyboardShortcuts {
  private handlers: ShortcutHandlers;
  private enabled = true;

  constructor(handlers: ShortcutHandlers) {
    this.handlers = handlers;
  }

  /**
   * Initialize keyboard shortcuts
   */
  init(): void {
    document.addEventListener("keydown", this.handleKeyDown);
  }

  /**
   * Destroy keyboard shortcuts
   */
  destroy(): void {
    document.removeEventListener("keydown", this.handleKeyDown);
  }

  /**
   * Enable or disable shortcuts
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Handle keydown event
   */
  private handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.enabled) return;

    // Don't trigger shortcuts when typing in input fields
    const target = event.target as HTMLElement;
    if (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable
    ) {
      return;
    }

    const { key, ctrlKey, metaKey, shiftKey } = event;
    const mod = ctrlKey || metaKey; // Cmd on Mac, Ctrl on Windows

    // Undo/Redo
    if (mod && key === "z" && !shiftKey) {
      event.preventDefault();
      this.handlers.onUndo?.();
      return;
    }

    if (mod && key === "z" && shiftKey) {
      event.preventDefault();
      this.handlers.onRedo?.();
      return;
    }

    // Save
    if (mod && key === "s") {
      event.preventDefault();
      this.handlers.onSave?.();
      return;
    }

    // Delete
    if (key === "Delete" || key === "Backspace") {
      event.preventDefault();
      this.handlers.onDelete?.();
      return;
    }

    // Escape - cancel current action
    if (key === "Escape") {
      event.preventDefault();
      this.handlers.onEscape?.();
      return;
    }

    // Gizmo modes (W/E/R for translate/rotate/scale)
    if (!mod && !shiftKey) {
      switch (key.toLowerCase()) {
        case "w":
          event.preventDefault();
          this.handlers.onGizmoMode?.("translate");
          return;
        case "e":
          event.preventDefault();
          this.handlers.onGizmoMode?.("rotate");
          return;
        case "r":
          event.preventDefault();
          this.handlers.onGizmoMode?.("scale");
          return;
      }
    }

    // Quick place shortcuts (C for camera, L for light, etc.)
    if (!mod && !shiftKey) {
      const quickPlace: Record<string, ToolType> = {
        c: "camera",
        l: "light",
        a: "cast_mark", // A for Actor
        p: "equipment", // P for Props (note: we'll map to equipment for now)
      };

      const type = quickPlace[key.toLowerCase()];
      if (type) {
        event.preventDefault();
        this.handlers.onPlaceElement?.(type);
        return;
      }
    }

    // Mode toggles (with Shift modifier to avoid conflicts)
    if (!mod && shiftKey) {
      switch (key.toLowerCase()) {
        case "s":
          event.preventDefault();
          this.handlers.onToggleSequenceMode?.();
          return;
        case "r":
          event.preventDefault();
          this.handlers.onToggleReviewMode?.();
          return;
      }
    }
  };
}

/**
 * Get keyboard shortcut display text for the platform
 */
export function getShortcutText(shortcut: string): string {
  const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  return shortcut.replace("Mod", isMac ? "⌘" : "Ctrl");
}

/**
 * Shortcut reference for display in UI
 */
export const SHORTCUT_REFERENCE = {
  undo: "Mod+Z",
  redo: "Mod+Shift+Z",
  save: "Mod+S",
  delete: "Del / Backspace",
  escape: "Esc",
  translate: "W",
  rotate: "E",
  scale: "R",
  placeCamera: "C",
  placeLight: "L",
  placeActor: "A",
  sequenceMode: "Shift+S",
  reviewMode: "Shift+R",
};
