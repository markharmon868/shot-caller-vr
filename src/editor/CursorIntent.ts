/**
 * CursorIntent — Alan Kay principle: The medium feels alive
 * The cursor should communicate what will happen — before the click
 */

export type Intent = "idle" | "placing" | "selected" | "moving" | "orbiting" | "gizmo";

const CURSOR_STYLES: Record<Intent, string> = {
  idle: "default",
  placing: "crosshair", // I'm about to create something
  selected: "grab", // I'm holding something
  moving: "grabbing", // I'm actively transforming
  orbiting: "move", // I'm navigating space
  gizmo: "pointer", // I'm interacting with a gizmo
};

export class CursorIntentManager {
  private canvas: HTMLElement;
  private currentIntent: Intent = "idle";

  constructor(canvas: HTMLElement) {
    this.canvas = canvas;
  }

  set(intent: Intent): void {
    if (this.currentIntent === intent) return;
    this.currentIntent = intent;
    this.canvas.style.cursor = CURSOR_STYLES[intent];
  }

  get(): Intent {
    return this.currentIntent;
  }

  reset(): void {
    this.set("idle");
  }
}
