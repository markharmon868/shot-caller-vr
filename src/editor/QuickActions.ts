/**
 * QuickActions — Systrom principle: Surface the most common action
 * Floating action buttons for context-sensitive quick actions
 */

import type { ProductionElement } from "./elements/ProductionElement.js";
import type { CameraElement } from "./elements/CameraElement.js";

export interface QuickAction {
  id: string;
  label: string;
  icon?: string;
  handler: () => void;
  condition?: () => boolean;
}

/**
 * Show a floating quick action button
 */
export function showQuickAction(
  action: QuickAction,
  position: { x: number; y: number },
): HTMLButtonElement {
  // Remove existing quick action
  const existing = document.getElementById(`quick-action-${action.id}`);
  if (existing) {
    existing.remove();
  }

  const btn = document.createElement("button");
  btn.id = `quick-action-${action.id}`;
  btn.className = "quick-action-btn";
  btn.innerHTML = action.icon
    ? `<span class="quick-action-icon">${action.icon}</span> ${action.label}`
    : action.label;

  btn.style.cssText = `
    position: fixed;
    left: ${position.x}px;
    top: ${position.y}px;
    z-index: 1000;
  `;

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    action.handler();
    btn.remove();
  });

  document.body.appendChild(btn);

  // Animate in
  requestAnimationFrame(() => {
    btn.classList.add("visible");
  });

  return btn;
}

/**
 * Hide all quick action buttons
 */
export function hideQuickActions(): void {
  const buttons = document.querySelectorAll(".quick-action-btn");
  buttons.forEach((btn) => {
    btn.classList.remove("visible");
    setTimeout(() => btn.remove(), 200);
  });
}

/**
 * Show quick action for adding camera to sequence
 */
export function showSequenceAction(
  camera: CameraElement,
  position: { x: number; y: number },
  onSequence: (camera: CameraElement) => void,
): void {
  if (camera.shotNumber !== undefined) {
    return; // Already in sequence
  }

  showQuickAction(
    {
      id: "sequence",
      label: "Add to Sequence",
      icon: "📋",
      handler: () => onSequence(camera),
    },
    position,
  );
}

/**
 * Show quick action for duplicating element
 */
export function showDuplicateAction(
  element: ProductionElement,
  position: { x: number; y: number },
  onDuplicate: (element: ProductionElement) => void,
): void {
  showQuickAction(
    {
      id: "duplicate",
      label: "Duplicate",
      icon: "⎘",
      handler: () => onDuplicate(element),
    },
    { x: position.x, y: position.y + 40 },
  );
}

/**
 * Show quick actions for selected element
 */
export function showElementActions(
  element: ProductionElement,
  position: { x: number; y: number },
  handlers: {
    onDuplicate?: (element: ProductionElement) => void;
    onSequence?: (camera: CameraElement) => void;
    onDelete?: (element: ProductionElement) => void;
  },
): void {
  const actions: QuickAction[] = [];

  // Duplicate action (for all elements)
  if (handlers.onDuplicate) {
    actions.push({
      id: "duplicate",
      label: "Duplicate",
      icon: "⎘",
      handler: () => handlers.onDuplicate!(element),
    });
  }

  // Sequence action (only for cameras)
  if (element.type === "camera" && handlers.onSequence) {
    const camera = element as CameraElement;
    if (camera.shotNumber === undefined) {
      actions.push({
        id: "sequence",
        label: "Add to Sequence",
        icon: "📋",
        handler: () => handlers.onSequence!(camera),
      });
    }
  }

  // Delete action
  if (handlers.onDelete) {
    actions.push({
      id: "delete",
      label: "Delete",
      icon: "✕",
      handler: () => handlers.onDelete!(element),
    });
  }

  // Show actions vertically stacked
  actions.forEach((action, index) => {
    showQuickAction(action, {
      x: position.x,
      y: position.y + index * 44,
    });
  });
}
