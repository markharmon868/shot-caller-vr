/**
 * Toast — Simple non-blocking notification system
 * Raskin principle: No silent failures
 */

export type ToastType = "info" | "success" | "error" | "warning";

const TOAST_DURATION = 3000;
const TOAST_CONTAINER_ID = "toast-container";

export class ToastManager {
  private container: HTMLDivElement;

  constructor() {
    // Find or create container
    let existing = document.getElementById(TOAST_CONTAINER_ID) as HTMLDivElement | null;
    if (!existing) {
      existing = document.createElement("div");
      existing.id = TOAST_CONTAINER_ID;
      existing.className = "toast-container";
      document.body.appendChild(existing);
    }
    this.container = existing;
  }

  show(message: string, type: ToastType = "info", duration = TOAST_DURATION): void {
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    this.container.appendChild(toast);

    // Trigger enter animation
    requestAnimationFrame(() => {
      toast.classList.add("toast-visible");
    });

    // Auto-remove after duration
    setTimeout(() => {
      toast.classList.remove("toast-visible");
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, duration);
  }
}

// Singleton instance
let toastInstance: ToastManager | null = null;

export function toast(message: string, type: ToastType = "info", duration = TOAST_DURATION): void {
  if (!toastInstance) {
    toastInstance = new ToastManager();
  }
  toastInstance.show(message, type, duration);
}
