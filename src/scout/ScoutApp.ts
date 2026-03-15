/**
 * Location Scout — Google Maps + Street View picker.
 */

declare global {
  interface Window {
    google: typeof google;
    initScoutMap: () => void;
  }
}

interface PipelineJob {
  id: string;
  sceneId?: string;
  status: string;
  progress: string;
  splatFilename?: string;
  marbleViewerUrl?: string;
  error?: string;
}

let map: google.maps.Map;
let panorama: google.maps.StreetViewPanorama;
let marker: google.maps.Marker;
let svService: google.maps.StreetViewService;
let activeJobId: string | null = null;
let pollInterval: ReturnType<typeof setInterval> | null = null;

// Coordinates set by explicit user action (map click, search, marker drag).
// These are the only coordinates ever sent to the pipeline.
let confirmedLat: number | null = null;
let confirmedLng: number | null = null;

// Mirrors the current Street View panorama position (may differ from confirmed
// due to Google snapping). Used only for display, never for submission.
let pendingLat: number | null = null;
let pendingLng: number | null = null;

export function startScout(): void {
  const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || "";
  if (!apiKey) {
    showError("VITE_GOOGLE_MAPS_API_KEY is not set. Add it to .env and restart.");
    return;
  }
  window.initScoutMap = initMap;
  const script = document.createElement("script");
  script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initScoutMap&libraries=places`;
  script.async = true;
  script.defer = true;
  script.onerror = () => showError("Failed to load Google Maps. Enable 'Maps JavaScript API' in Google Cloud Console.");
  document.head.appendChild(script);
}

function initMap(): void {
  const mapEl = document.getElementById("scout-map") as HTMLDivElement;
  const svEl = document.getElementById("scout-streetview") as HTMLDivElement;

  map = new window.google.maps.Map(mapEl, {
    center: { lat: 34.0195, lng: -118.7350 }, // Malibu area default
    zoom: 13,
    mapTypeId: "roadmap",
    streetViewControl: false,
    fullscreenControl: false,
    mapTypeControl: false,
    styles: darkMapStyle,
  });

  panorama = new window.google.maps.StreetViewPanorama(svEl, {
    pov: { heading: 0, pitch: 0 },
    zoom: 0,
    addressControl: true,
    fullscreenControl: false,
    motionTrackingControl: false,
    showRoadLabels: true,
    clickToGo: true,
    visible: false, // hidden until user picks a location
  });

  marker = new window.google.maps.Marker({
    map,
    visible: false,
    draggable: true,
    icon: {
      path: window.google.maps.SymbolPath.CIRCLE,
      scale: 10,
      fillColor: "#f59e0b",
      fillOpacity: 1,
      strokeColor: "#fff",
      strokeWeight: 2,
    },
  });

  svService = new window.google.maps.StreetViewService();
  map.setStreetView(panorama);

  // Map click → set location
  map.addListener("click", (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    setLocation(e.latLng.lat(), e.latLng.lng(), "map_click");
  });

  // Places Autocomplete search box
  const searchInput = document.getElementById("scout-search-input") as HTMLInputElement | null;
  if (searchInput) {
    const autocomplete = new window.google.maps.places.Autocomplete(searchInput, {
      fields: ["geometry", "name"],
    });
    autocomplete.bindTo("bounds", map);
    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (!place.geometry?.location) return;
      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      map.setCenter({ lat, lng });
      map.setZoom(16);
      setLocation(lat, lng, "autocomplete");
      searchInput.blur();
    });
  }

  // Marker drag → update location
  marker.addListener("dragend", (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    setLocation(e.latLng.lat(), e.latLng.lng(), "marker_drag");
  });

  // Street view navigation → sync marker position only.
  // Do NOT update confirmedLat/confirmedLng here — Google may snap the panorama
  // to a nearby pano (different coords) when coverage is sparse, which would
  // silently overwrite the user's explicit map selection.
  panorama.addListener("position_changed", () => {
    const pos = panorama.getPosition();
    if (!pos) return;
    const lat = pos.lat();
    const lng = pos.lng();
    // Only update display if we already have a selection (navigating within SV)
    if (pendingLat !== null) {
      pendingLat = lat;
      pendingLng = lng;
      marker.setPosition({ lat, lng });
      // Update display coords only — do NOT touch confirmedLat/confirmedLng
      // and do NOT write to btn.dataset (those remain the user's explicit pick)
      const el = document.getElementById("scout-coords");
      if (el) el.textContent = `SV: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
  });

  loadRecentJobs();
}

function setLocation(lat: number, lng: number, source: string): void {
  console.log(`[Scout] Location set from ${source}: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
  // Lock in the confirmed coordinates — only explicit user actions reach here.
  confirmedLat = lat;
  confirmedLng = lng;
  pendingLat = lat;
  pendingLng = lng;

  marker.setPosition({ lat, lng });
  marker.setVisible(true);
  panorama.setPosition({ lat, lng });
  panorama.setVisible(true);
  map.panTo({ lat, lng });

  updateCoords(lat, lng);
  setGenerateEnabled(true);

  // Check Street View coverage — warn if no imagery at this spot
  clearCoverageWarning();
  if (svService) {
    svService.getPanorama(
      { location: { lat, lng }, radius: 80, source: window.google.maps.StreetViewSource.OUTDOOR },
      (_data: unknown, status: string) => {
        if (status !== "OK") {
          showCoverageWarning();
        }
      }
    );
  }
}

function showCoverageWarning(): void {
  let el = document.getElementById("scout-coverage-warn");
  if (!el) {
    el = document.createElement("div");
    el.id = "scout-coverage-warn";
    el.style.cssText = [
      "margin-top:8px", "padding:8px 10px", "border-radius:6px",
      "background:rgba(245,158,11,0.12)", "border:1px solid rgba(245,158,11,0.4)",
      "color:#fbbf24", "font-size:12px", "line-height:1.5",
    ].join(";");
    const btn = document.getElementById("scout-generate-btn");
    btn?.parentElement?.insertBefore(el, btn);
  }
  el.textContent = "⚠ No Street View imagery found here. Try clicking on a road or path nearby.";
  el.style.display = "block";
}

function clearCoverageWarning(): void {
  const el = document.getElementById("scout-coverage-warn");
  if (el) el.style.display = "none";
}

function updateCoords(lat: number, lng: number): void {
  // Shows the user's confirmed (explicitly selected) coordinates.
  // This is called only from setLocation() — never from position_changed.
  const el = document.getElementById("scout-coords");
  if (el) el.textContent = `Selected: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

function setGenerateEnabled(enabled: boolean): void {
  const btn = document.getElementById("scout-generate-btn") as HTMLButtonElement | null;
  if (btn) btn.disabled = !enabled;
}

function showError(msg: string): void {
  const el = document.getElementById("scout-error");
  if (el) { el.textContent = msg; el.style.display = "block"; }
}

function setStatus(msg: string, type: "idle" | "running" | "done" | "error" = "running"): void {
  const el = document.getElementById("scout-status");
  if (!el) return;
  el.textContent = msg;
  el.dataset.type = type;
  el.style.display = msg ? "block" : "none";
}

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

export function onGenerateClick(): void {
  if (activeJobId) return;

  // confirmedLat/confirmedLng are the ONLY source of truth for submission.
  // They are set exclusively by explicit user actions (map click, search,
  // marker drag) and are never overwritten by panorama position_changed events.
  const lat = confirmedLat;
  const lng = confirmedLng;

  if (lat === null || lng === null) {
    showError("Click on the map to select a location first.");
    return;
  }

  console.log(`[Scout] Submitting pipeline for lat=${lat}, lng=${lng} (confirmed)`);

  // Show confirmation coords in status
  setStatus(`Starting pipeline for ${lat.toFixed(5)}, ${lng.toFixed(5)}...`, "running");
  setGenerateEnabled(false);

  fetch("/api/pipeline/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lat, lng }),
  })
    .then((r) => r.json() as Promise<{ jobId: string }>)
    .then(({ jobId }) => {
      activeJobId = jobId;
      startPolling(jobId);
    })
    .catch((err) => {
      setStatus(`Failed to start: ${err instanceof Error ? err.message : err}`, "error");
      setGenerateEnabled(true);
    });
}

function startPolling(jobId: string): void {
  if (pollInterval) clearInterval(pollInterval);
  pollInterval = setInterval(() => pollStatus(jobId), 3000);
}

function pollStatus(jobId: string): void {
  fetch(`/api/pipeline/status/${jobId}`)
    .then((r) => r.json() as Promise<PipelineJob>)
    .then((job) => {
      if (job.status === "error") {
        if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
        const msg = job.error ?? job.progress;
        const isCoverage = msg?.toLowerCase().includes("no street view");
        setStatus(
          isCoverage
            ? "⚠ No Street View imagery at this location. Pick a spot on a road or path and try again."
            : `Error: ${msg}`,
          "error"
        );
        activeJobId = null;
        setGenerateEnabled(true);
      } else if (job.status === "done" && job.splatFilename) {
        if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
        setStatus(job.progress, "done");
        showDoneState(job);
      } else {
        setStatus(job.progress, "running");
      }
    })
    .catch(() => {});
}

function showDoneState(job: PipelineJob): void {
  const panel = document.getElementById("scout-done-panel");
  if (!panel) return;
  const sceneId = job.sceneId ?? job.id.slice(0, 8).toUpperCase();
  const editorUrl = `/?mode=editor&scene=${sceneId}&splat=./splats/${job.splatFilename}`;
  panel.innerHTML = `
    <p class="scout-done-label">Scene ready!</p>
    <a class="scout-open-btn" href="${editorUrl}">Open in Editor →</a>
    ${job.marbleViewerUrl ? `<a class="scout-marble-link" href="${job.marbleViewerUrl}" target="_blank">View in Marble ↗</a>` : ""}
  `;
  panel.style.display = "flex";
  activeJobId = null;
  setGenerateEnabled(true);
  loadRecentJobs();
}

function loadRecentJobs(): void {
  fetch("/api/pipeline/jobs")
    .then((r) => r.json() as Promise<PipelineJob[]>)
    .then((jobs) => {
      const list = document.getElementById("scout-recent-list");
      if (!list) return;
      const done = jobs.filter((j) => j.status === "done" && j.splatFilename);
      if (done.length === 0) {
        list.innerHTML = '<div style="font-size:11px;color:#374151;">No scenes yet.</div>';
        return;
      }
      list.innerHTML = done.slice(0, 5).map((j) => {
        const sid = j.sceneId ?? j.id.slice(0, 8).toUpperCase();
        return `
        <div class="scout-recent-item">
          <span>${j.splatFilename}</span>
          <a href="/?mode=editor&scene=${sid}&splat=./splats/${j.splatFilename}">Open →</a>
        </div>`;
      }).join("");
    })
    .catch(() => {});
}

// ---------------------------------------------------------------------------
// Dark map style
// ---------------------------------------------------------------------------

const darkMapStyle: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#1a1a2e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a1a2e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#6b7280" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2d2d44" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#1a1a2e" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#374151" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#9ca3af" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0d1117" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#374151" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#9ca3af" }] },
];
