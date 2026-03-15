export type AppMode =
  | "landing"
  | "scout"
  | "intake"
  | "editor"
  | "vr"
  | "headset-empty";

export function isHeadsetBrowser(userAgent: string): boolean {
  return /PicoXR|OculusBrowser|SamsungBrowser\/.*VR|Mobile VR|Quest/i.test(userAgent);
}

export function hasSceneId(url: URL): boolean {
  return Boolean(url.searchParams.get("scene")?.trim());
}

export function resolveAppMode(url: URL, userAgent: string): AppMode {
  const explicitMode = url.searchParams.get("mode");
  const headset = isHeadsetBrowser(userAgent);
  const sceneAvailable = hasSceneId(url);

  if (explicitMode === "landing") return "landing";
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
    if (!sceneAvailable) {
      // Default to a known scene so headset users don't need to type query params
      url.searchParams.set("scene", "697DF004");
      window.history.replaceState(null, "", url.toString());
    }
    return "vr";
  }

  // Desktop default: marketing landing page
  // Skip straight to editor/scout if splat or scene param is present
  if (url.searchParams.get("splat") || sceneAvailable) return "editor";
  return "landing";
}
