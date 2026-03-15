/**
 * Toast notifications for transient user feedback.
 * Replaces alert() and console.log for success/error messages.
 */
export type ToastType = "info" | "success" | "error";

export function toast(
  message: string,
  type: ToastType = "info"
): void {
  const el = document.createElement("div");
  el.className = `toast toast-${type}`;
  el.setAttribute("role", "status");
  el.setAttribute("aria-live", type === "error" ? "assertive" : "polite");
  el.textContent = message;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add("toast-visible"));
  const hide = () => {
    el.classList.remove("toast-visible");
    setTimeout(() => el.remove(), 300);
  };
  setTimeout(hide, 2800);
}
