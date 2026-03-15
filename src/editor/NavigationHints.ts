/**
 * NavigationHints — Norman principle: Recognition over recall
 * Show orbit/pan/zoom hints on first canvas interaction
 */

const STORAGE_KEY = "shot-caller:hints-shown";

export interface HintConfig {
  id: string;
  message: string;
  position?: { x: number; y: number };
  duration?: number;
}

/**
 * Show a floating hint overlay
 */
export function showHint(config: HintConfig): void {
  const existing = document.getElementById(`hint-${config.id}`);
  if (existing) return;

  const hint = document.createElement("div");
  hint.id = `hint-${config.id}`;
  hint.className = "navigation-hint";
  hint.innerHTML = `
    <div class="navigation-hint-content">
      ${config.message}
      <button class="navigation-hint-close" aria-label="Close hint">✕</button>
    </div>
  `;

  if (config.position) {
    hint.style.cssText = `
      position: fixed;
      left: ${config.position.x}px;
      top: ${config.position.y}px;
    `;
  } else {
    hint.style.cssText = `
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
    `;
  }

  document.body.appendChild(hint);

  // Fade in
  requestAnimationFrame(() => {
    hint.classList.add("visible");
  });

  // Close button
  const closeBtn = hint.querySelector(".navigation-hint-close");
  closeBtn?.addEventListener("click", () => {
    dismissHint(config.id);
  });

  // Auto-dismiss after duration
  if (config.duration) {
    setTimeout(() => {
      dismissHint(config.id);
    }, config.duration);
  }
}

/**
 * Dismiss a hint
 */
export function dismissHint(id: string): void {
  const hint = document.getElementById(`hint-${id}`);
  if (!hint) return;

  hint.classList.remove("visible");
  setTimeout(() => {
    hint.remove();
  }, 300);
}

/**
 * Initialize navigation hints on first canvas interaction
 */
export function initNavigationHints(canvas: HTMLElement): void {
  // Check if hints have been shown before
  const shown = localStorage.getItem(STORAGE_KEY);
  if (shown) return;

  let interactionCount = 0;

  const showNavigationHints = (): void => {
    interactionCount++;

    if (interactionCount === 1) {
      // First interaction - show navigation controls
      showHint({
        id: "navigation",
        message: `
          <strong>Navigate the Scene</strong><br>
          <kbd>Drag</kbd> to orbit • <kbd>Right-drag</kbd> to pan • <kbd>Scroll</kbd> to zoom
        `,
        duration: 8000,
      });
    }

    if (interactionCount === 2) {
      // Second interaction - mark as shown
      localStorage.setItem(STORAGE_KEY, "true");
    }
  };

  canvas.addEventListener("mousedown", showNavigationHints, { once: true });
}

/**
 * Show first-run onboarding hints
 */
export function showOnboardingHints(): void {
  const shown = localStorage.getItem(STORAGE_KEY);
  if (shown) return;

  // Show welcome hint after a brief delay
  setTimeout(() => {
    showHint({
      id: "welcome",
      message: `
        <strong>Welcome to Shot Caller</strong><br>
        Select an element type from the left panel, then click in the scene to place it.
      `,
      duration: 10000,
    });
  }, 1000);
}

/**
 * Reset hints (for testing or user preference)
 */
export function resetHints(): void {
  localStorage.removeItem(STORAGE_KEY);
}
