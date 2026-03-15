export type AppMode =
  | "home"
  | "create"
  | "intake"
  | "editor"
  | "stage4-xr"
  | "stage5-xr"
  | "viewer"
  | "export"
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

  if (
    explicitMode === "home"
    || explicitMode === "create"
    || explicitMode === "intake"
    || explicitMode === "editor"
    || explicitMode === "stage4-xr"
    || explicitMode === "stage5-xr"
    || explicitMode === "viewer"
    || explicitMode === "export"
  ) {
    if ((explicitMode === "stage4-xr" || explicitMode === "stage5-xr") && headset && !sceneAvailable) {
      return "headset-empty";
    }
    return explicitMode;
  }

  if (headset && sceneAvailable) {
    return "stage4-xr";
  }
  if (headset && !sceneAvailable) {
    return "headset-empty";
  }
  // Desktop: land on marketing home by default
  return "home";
}
