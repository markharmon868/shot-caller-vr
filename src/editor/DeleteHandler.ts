/**
 * DeleteHandler — Tesler principle: Instant confirmation
 * Show inline confirmation on the element, not a blocking modal
 */

import { toast } from "./Toast.js";

export type DeleteCallback = (elementId: string) => void;

let activeConfirm: HTMLDivElement | null = null;

/**
 * Request delete with inline confirmation
 */
export function requestDelete(
  elementId: string,
  elementLabel: string,
  onConfirm: DeleteCallback,
): void {
  // Remove any existing confirmation
  if (activeConfirm) {
    activeConfirm.remove();
    activeConfirm = null;
  }

  const confirm = document.createElement("div");
  confirm.className = "delete-confirm";
  confirm.innerHTML = `
    <span class="delete-confirm-text">Delete "${elementLabel}"?</span>
    <button class="delete-confirm-btn delete-confirm-yes" id="confirm-yes">Yes</button>
    <button class="delete-confirm-btn delete-confirm-no" id="confirm-no">No</button>
  `;

  // Position in the center of the viewport (could be enhanced to position near element)
  confirm.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 10000;
  `;

  document.body.appendChild(confirm);
  activeConfirm = confirm;

  // Bind events
  const yesBtn = document.getElementById("confirm-yes");
  const noBtn = document.getElementById("confirm-no");

  yesBtn?.addEventListener("click", () => {
    onConfirm(elementId);
    confirm.remove();
    activeConfirm = null;
    toast(`Deleted ${elementLabel}`, "info");
  });

  noBtn?.addEventListener("click", () => {
    confirm.remove();
    activeConfirm = null;
  });

  // Auto-dismiss after 4s
  setTimeout(() => {
    if (activeConfirm === confirm) {
      confirm.remove();
      activeConfirm = null;
    }
  }, 4000);

  // Focus the No button by default (safer)
  noBtn?.focus();
}
