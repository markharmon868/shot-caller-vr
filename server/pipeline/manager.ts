/**
 * Server-side pipeline job manager.
 * Runs Street View fetch + Marble Labs generation async,
 * stores job status in memory for the frontend to poll.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "node:crypto";

// Pipeline modules run in the same process
import { fetchStreetViewImages } from "../../pipeline/street-view/index.js";
import { generateSplat, pollOperation, downloadFile } from "../../pipeline/world-model/marble.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_SPLATS = path.resolve(__dirname, "../../public/splats");
const PUBLIC_SCENES = path.resolve(__dirname, "../../public/scenes");

export type JobStatus =
  | "fetching_street_view"
  | "uploading_images"
  | "generating_splat"
  | "downloading"
  | "done"
  | "error";

export interface PipelineJob {
  id: string;
  sceneId: string;
  lat: number;
  lng: number;
  status: JobStatus;
  progress: string;
  splatFilename?: string;
  colliderFilename?: string;
  metricScaleFactor?: number;
  groundPlaneOffset?: number;
  marbleViewerUrl?: string;
  error?: string;
  createdAt: string;
}

const JOBS_FILE = path.resolve(__dirname, "../../.data/pipeline-jobs.json");

const jobs = new Map<string, PipelineJob>();

// Load persisted jobs from disk on startup
function loadPersistedJobs(): void {
  try {
    if (fs.existsSync(JOBS_FILE)) {
      const saved = JSON.parse(fs.readFileSync(JOBS_FILE, "utf-8")) as PipelineJob[];
      for (const job of saved) jobs.set(job.id, job);
      console.log(`[Pipeline] Loaded ${saved.length} persisted jobs from disk`);
    }
  } catch (e) {
    console.warn("[Pipeline] Failed to load persisted jobs:", e);
  }
}

function persistJobs(): void {
  try {
    fs.mkdirSync(path.dirname(JOBS_FILE), { recursive: true });
    fs.writeFileSync(JOBS_FILE, JSON.stringify(Array.from(jobs.values()), null, 2));
  } catch (e) {
    console.warn("[Pipeline] Failed to persist jobs:", e);
  }
}

loadPersistedJobs();

export function getJob(id: string): PipelineJob | undefined {
  return jobs.get(id);
}

export function listJobs(): PipelineJob[] {
  return Array.from(jobs.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function update(job: PipelineJob, patch: Partial<PipelineJob>) {
  Object.assign(job, patch);
  // Persist whenever a terminal state is reached
  if (patch.status === "done" || patch.status === "error") persistJobs();
}

export function startPipelineJob(lat: number, lng: number): string {
  const id = randomUUID();
  const sceneId = id.slice(0, 8).toUpperCase();
  const job: PipelineJob = {
    id,
    sceneId,
    lat,
    lng,
    status: "fetching_street_view",
    progress: "Fetching Street View images...",
    createdAt: new Date().toISOString(),
  };
  jobs.set(id, job);
  runJob(job).catch((err) => {
    update(job, { status: "error", error: err instanceof Error ? err.message : String(err) });
  });
  return id;
}

async function runJob(job: PipelineJob): Promise<void> {
  fs.mkdirSync(PUBLIC_SPLATS, { recursive: true });

  // Use a job-specific raw dir to avoid conflicts between concurrent jobs
  const rawDir = path.resolve(__dirname, `../../pipeline/data/raw/${job.id}`);
  fs.mkdirSync(rawDir, { recursive: true });

  // Step 1: Fetch Street View images
  update(job, { status: "fetching_street_view", progress: "Fetching 24 Street View images..." });
  const sv = await fetchStreetViewImages({ lat: job.lat, lng: job.lng });

  for (const img of sv.images) {
    const filename = `sv_h${img.heading}_p${img.pitch}.jpg`;
    fs.writeFileSync(path.join(rawDir, filename), img.buffer);
  }

  // Step 2: Upload to Marble
  update(job, { status: "uploading_images", progress: `Uploading ${sv.images.length} images to Marble Labs...` });

  const imageFiles = fs.readdirSync(rawDir).filter((f) => /\.jpg$/i.test(f)).sort();
  const images = imageFiles.map((f) => {
    const match = f.match(/^sv_h(\d+)_p/);
    return { imagePath: path.join(rawDir, f), azimuthDegrees: match ? parseInt(match[1], 10) : undefined };
  });

  let uploadCount = 0;
  const operationId = await generateSplat({
    images,
    displayName: `shot-caller-${job.id.slice(0, 8)}`,
    model: "Marble 0.1-plus",
    onProgress: (msg) => {
      if (msg.includes("Uploading")) {
        uploadCount++;
        update(job, { progress: `Uploading images to Marble Labs (${uploadCount}/${images.length})...` });
      }
    },
  });

  // Step 3: Poll Marble
  update(job, { status: "generating_splat", progress: "Generating Gaussian splat (this takes ~5 minutes)..." });
  const op = await pollOperation(operationId, {
    intervalMs: 10_000,
    timeoutMs: 15 * 60 * 1000,
    onProgress: () => {
      const elapsedMin = Math.round((Date.now() - new Date(job.createdAt).getTime()) / 60000);
      update(job, { progress: `Generating Gaussian splat... (${elapsedMin}m elapsed)` });
    },
  });

  if (op.error || !op.splatUrlFull) {
    throw new Error(op.error ?? "Marble returned no splat URL");
  }

  // Step 4: Download outputs
  update(job, { status: "downloading", progress: "Downloading Gaussian splat..." });

  const splatFilename = `scene-${job.id.slice(0, 8)}.spz`;
  const colliderFilename = `scene-${job.id.slice(0, 8)}-collider.glb`;

  await downloadFile(op.splatUrlFull, path.join(PUBLIC_SPLATS, splatFilename));

  if (op.colliderUrl) {
    await downloadFile(op.colliderUrl, path.join(PUBLIC_SPLATS, colliderFilename));
  }

  // Save metadata
  fs.writeFileSync(
    path.join(PUBLIC_SPLATS, `scene-${job.id.slice(0, 8)}-meta.json`),
    JSON.stringify({ worldId: op.worldId, marbleViewerUrl: op.marbleViewerUrl, metricScaleFactor: op.metricScaleFactor, groundPlaneOffset: op.groundPlaneOffset }, null, 2)
  );

  // Clean up raw images
  fs.rmSync(rawDir, { recursive: true, force: true });

  // Generate scene JSON files so VR mode can load this scene by its sceneId
  const sceneId = job.sceneId;
  const assetsJson = path.resolve(PUBLIC_SCENES, "demo.assets.json");
  const worldJson = {
    sceneId,
    version: 1,
    unit: "meters",
    splatUrl: `/splats/${splatFilename}`,
    colliderUrl: op.colliderUrl ? `/splats/${colliderFilename}` : "builtin://floor",
    assetCatalogUrl: `/scenes/demo.assets.json`,
    worldBounds: { min: [-8, 0, -8], max: [8, 4, 8] },
  };
  const sceneJson = {
    sceneId,
    version: 1,
    worldVersion: 1,
    revision: 1,
    status: "draft",
    elements: [],
    reviewIssues: [],
    approval: { status: "pending", reviewer: "", decidedAt: "", sceneRevision: 1, note: "" },
    exportState: { status: "idle", lastCaptureDataUrl: "", requestedAt: "", lastPayload: "" },
  };
  fs.mkdirSync(PUBLIC_SCENES, { recursive: true });
  fs.writeFileSync(path.join(PUBLIC_SCENES, `${sceneId}.world.json`), JSON.stringify(worldJson, null, 2));
  fs.writeFileSync(path.join(PUBLIC_SCENES, `${sceneId}.scene.json`), JSON.stringify(sceneJson, null, 2));
  // Copy assets catalog (reuse demo's)
  if (fs.existsSync(assetsJson)) {
    fs.copyFileSync(assetsJson, path.join(PUBLIC_SCENES, `${sceneId}.assets.json`));
  }

  update(job, {
    status: "done",
    progress: "Scene ready!",
    splatFilename,
    colliderFilename: op.colliderUrl ? colliderFilename : undefined,
    metricScaleFactor: op.metricScaleFactor,
    groundPlaneOffset: op.groundPlaneOffset,
    marbleViewerUrl: op.marbleViewerUrl,
  });
}
