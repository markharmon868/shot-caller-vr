export type AppMode =
  | "home"
  | "landing"
  | "create"
  | "scout"
  | "intake"
  | "editor"
  | "vr"
  | "headset-empty";

export function isHeadsetBrowser(userAgent: string): boolean {
  const headsetPattern = /OculusBrowser|PicoXR|SamsungBrowser\/.*VR|Mobile VR/i;
  if (!headsetPattern.test(userAgent)) return false;

  // IWER dev emulator replaces navigator.userAgent with a Quest-like string
  // on desktop browsers. Detect emulator via its injected global, or by
  // checking for a fine pointer (mouse) which real headsets don't have.
  if (typeof window !== "undefined") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).__IWER_ACTIVE__ || (window as any).__iwer) return false;
    if (window.matchMedia?.("(pointer: fine)")?.matches) return false;
  }

  // Desktop browsers (including IWER dev emulator) should always be treated as desktop.
  // Real headset browsers don't include desktop OS tokens.
  const isDesktop = /Windows NT|Macintosh|X11.*Linux/i.test(userAgent);
  if (isDesktop) return false;

  return true;
}

export function hasSceneId(url: URL): boolean {
  return Boolean(url.searchParams.get("scene")?.trim());
}

export function isDemoMode(url: URL): boolean {
  return url.searchParams.get("demo") === "1";
}

export function resolveAppMode(url: URL, userAgent: string): AppMode {
  const explicitMode = url.searchParams.get("mode");
  const headset = isHeadsetBrowser(userAgent);
  const sceneAvailable = hasSceneId(url);

  // Handle all explicit modes
  if (explicitMode === "home") return "home";
  if (explicitMode === "landing") return "landing";
  if (explicitMode === "create") return "create";
  if (explicitMode === "scout") return "scout";
  if (explicitMode === "intake") return "intake";
  if (explicitMode === "editor") return "editor";

  // Accept both "vr" and legacy "stage4-xr" / "stage5-xr"
  if (explicitMode === "vr" || explicitMode === "stage4-xr" || explicitMode === "stage5-xr") {
    if (headset && !sceneAvailable) return "headset-empty";
    return "vr";
  }

  // Auto-detect real headset (but not localhost — IWER emulator spoofs the UA there)
  const isLocalhost = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (headset && !isLocalhost) {
    if (sceneAvailable) return "vr";
    return "headset-empty";
  }

  // Desktop default: landing page
  // Skip straight to editor if splat or scene param is present
  if (url.searchParams.get("splat") || sceneAvailable) return "editor";
  return "landing";
}
