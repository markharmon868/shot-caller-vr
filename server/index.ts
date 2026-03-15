import { randomUUID } from "node:crypto";

import express, { type Request, type Response } from "express";
import multer from "multer";

import {
  CreateThreadResponseSchema,
  IntakeThreadStateSchema,
  IntakeTurnRequestSchema,
  IntakeTurnResponseSchema,
  type IntakeTurnResponse,
  type UploadRef,
} from "../shared/contracts/intake.js";
import { serverConfig, validateServerConfig } from "./config.js";
import {
  deriveFallbackQuestions,
  isEmptyQuestionsValidationError,
} from "./intake/intake-decision.js";
import {
  toConversationTurn,
  type SubmittedTurn,
} from "./intake/messages.js";
import { getAppRuntime } from "./intake/runtime.js";

function getResourceId(req: Request): string {
  const value = req.header("x-shot-caller-resource-id")?.trim();
  if (!value) {
    throw new Error("Missing x-shot-caller-resource-id header.");
  }
  return value;
}

function getSingleParam(value: string | string[] | undefined, name: string): string {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  if (Array.isArray(value) && value.length > 0 && typeof value[0] === "string") {
    return value[0];
  }
  throw new Error(`Missing route parameter "${name}".`);
}

function toSubmittedTurn(body: unknown, uploads: UploadRef[]): SubmittedTurn {
  const parsed = IntakeTurnRequestSchema.parse(body);
  return {
    text: parsed.text,
    locationInput: parsed.locationInput,
    uploads,
  };
}

function validateTurnPayload(turn: SubmittedTurn): void {
  const hasLocation = Boolean(turn.locationInput?.address || turn.locationInput?.mapsUrl);
  if (!turn.text && turn.uploads.length === 0 && !hasLocation) {
    throw new Error("At least one of text, location input, or attachments is required.");
  }
}

function sendIntakeTurnResponse(res: Response, payload: IntakeTurnResponse): void {
  res.json(IntakeTurnResponseSchema.parse(payload));
}

async function buildThreadState(req: Request, res: Response): Promise<void> {
  const runtime = await getAppRuntime();
  const resourceId = getResourceId(req);
  const threadId = getSingleParam(req.params.threadId, "threadId");
  const session = await runtime.sessionStore.getSession(threadId);

  if (!session) {
    res.status(404).json({ error: "Unknown intake thread." });
    return;
  }

  if (session.resourceId !== resourceId) {
    res.status(403).json({ error: "Thread does not belong to this resource." });
    return;
  }

  const recalled = await runtime.memory.recall({
    threadId,
    resourceId,
    perPage: false,
    orderBy: { field: "createdAt", direction: "ASC" },
  });

  const state = IntakeThreadStateSchema.parse({
    threadId,
    resourceId,
    status: session.status,
    transcript: recalled.messages.map(toConversationTurn),
    latestQuestions: session.latestQuestions ?? undefined,
    result: session.result ?? undefined,
  });

  res.json(state);
}

async function createServer() {
  const app = express();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: serverConfig.upload.maxFileSizeBytes,
      files: 8,
    },
  });

  app.use(express.json({ limit: "1mb" }));

  app.post("/api/intake/threads", async (req, res) => {
    try {
      const runtime = await getAppRuntime();
      const resourceId = getResourceId(req);
      const thread = await runtime.memory.createThread({
        resourceId,
        threadId: randomUUID(),
        title: "Shot Caller intake",
        metadata: {
          kind: "shot-caller-intake",
        },
      });
      const run = await runtime.intakeWorkflow.createRun({
        resourceId,
      });
      await runtime.sessionStore.createSession({
        threadId: thread.id,
        resourceId,
        activeRunId: run.runId,
      });

      res.status(201).json(
        CreateThreadResponseSchema.parse({
          threadId: thread.id,
          resourceId,
          runId: run.runId,
          status: "collecting",
        }),
      );
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to create thread." });
    }
  });

  app.post("/api/intake/threads/:threadId/attachments", upload.array("files"), async (req, res) => {
    try {
      const runtime = await getAppRuntime();
      const resourceId = getResourceId(req);
      const threadId = getSingleParam(req.params.threadId, "threadId");
      const session = await runtime.sessionStore.getSession(threadId);

      if (!session) {
        res.status(404).json({ error: "Unknown intake thread." });
        return;
      }
      if (session.resourceId !== resourceId) {
        res.status(403).json({ error: "Thread does not belong to this resource." });
        return;
      }

      const files = (req.files ?? []) as Express.Multer.File[];
      if (files.length === 0) {
        res.status(400).json({ error: "No files uploaded." });
        return;
      }

      const uploads = await Promise.all(
        files.map((file) => {
          if (!file.mimetype.startsWith("image/")) {
            throw new Error(`Unsupported upload type "${file.mimetype}".`);
          }

          return runtime.assetStore.saveUpload({
            threadId,
            buffer: file.buffer,
            mimeType: file.mimetype,
            originalFilename: file.originalname,
          });
        }),
      );

      res.status(201).json(uploads);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to upload attachments." });
    }
  });

  app.get("/api/intake/assets/:assetId", async (req, res) => {
    try {
      const runtime = await getAppRuntime();
      const assetId = getSingleParam(req.params.assetId, "assetId");
      const asset = await runtime.assetStore.getAsset(assetId);
      if (!asset) {
        res.status(404).json({ error: "Unknown asset." });
        return;
      }
      res.type(asset.mimeType);
      res.sendFile(runtime.assetStore.resolveAbsolutePath(asset));
    } catch (error) {
      res.status(404).json({ error: error instanceof Error ? error.message : "Failed to load asset." });
    }
  });

  app.post("/api/intake/threads/:threadId/turns", async (req, res) => {
    let runtime: Awaited<ReturnType<typeof getAppRuntime>> | undefined;
    let resourceId: string | undefined;
    let threadId: string | undefined;
    let activeRunId: string | undefined;
    let turn: SubmittedTurn | undefined;

    try {
      runtime = await getAppRuntime();
      resourceId = getResourceId(req);
      threadId = getSingleParam(req.params.threadId, "threadId");
      const session = await runtime.sessionStore.getSession(threadId);

      if (!session) {
        res.status(404).json({ error: "Unknown intake thread." });
        return;
      }
      if (session.resourceId !== resourceId) {
        res.status(403).json({ error: "Thread does not belong to this resource." });
        return;
      }
      if (session.status === "prompt_bundle_ready" && session.result) {
        res.json({
          status: "prompt_bundle_ready",
          threadId,
          runId: session.activeRunId,
          result: session.result,
        } satisfies IntakeTurnResponse);
        return;
      }

      activeRunId = session.activeRunId;
      const parsed = IntakeTurnRequestSchema.parse(req.body);
      const uploads = await runtime.assetStore.getUploadsForThread(threadId, parsed.attachments);
      turn = toSubmittedTurn(parsed, uploads);
      validateTurnPayload(turn);

      const run = await runtime.intakeWorkflow.createRun({
        runId: session.activeRunId,
        resourceId,
      });

      const result =
        session.status === "needs_user_input"
          ? await run.resume({
              label: "user-reply",
              resumeData: turn,
              outputOptions: {
                includeState: true,
                includeResumeLabels: true,
              },
            })
          : await run.start({
              inputData: {
                threadId,
                resourceId,
                turn,
              },
              outputOptions: {
                includeState: true,
                includeResumeLabels: true,
              },
            });

      if (result.status === "suspended") {
        const rawQuestions = Array.isArray(result.suspendPayload?.questions)
          ? result.suspendPayload.questions.filter(
              (question: unknown): question is string => typeof question === "string",
            )
          : [];
        const questions = rawQuestions.length > 0
          ? rawQuestions
          : deriveFallbackQuestions({
              priorMessages: (
                await runtime.memory.recall({
                  threadId,
                  resourceId,
                  perPage: false,
                  orderBy: { field: "createdAt", direction: "ASC" },
                })
              ).messages,
              turn,
            });

        await runtime.sessionStore.updateSession({
          threadId,
          status: "needs_user_input",
          latestQuestions: questions,
        });

        sendIntakeTurnResponse(res, {
          status: "needs_user_input",
          threadId,
          runId: activeRunId,
          questions,
        });
        return;
      }

      if (result.status !== "success") {
        await runtime.sessionStore.updateSession({
          threadId,
          status: "failed",
          latestQuestions: null,
          result: null,
        });
        res.status(500).json({ error: `Workflow ended with status "${result.status}".` });
        return;
      }

      await runtime.sessionStore.updateSession({
        threadId,
        status: "prompt_bundle_ready",
        latestQuestions: null,
        result: result.result,
      });

      sendIntakeTurnResponse(res, {
        status: "prompt_bundle_ready",
        threadId,
        runId: activeRunId,
        result: result.result,
      });
    } catch (error) {
      if (runtime && resourceId && threadId && activeRunId && turn && isEmptyQuestionsValidationError(error)) {
        const recalled = await runtime.memory.recall({
          threadId,
          resourceId,
          perPage: false,
          orderBy: { field: "createdAt", direction: "ASC" },
        });
        const questions = deriveFallbackQuestions({
          priorMessages: recalled.messages,
          turn,
        });

        await runtime.sessionStore.updateSession({
          threadId,
          status: "needs_user_input",
          latestQuestions: questions,
        });

        sendIntakeTurnResponse(res, {
          status: "needs_user_input",
          threadId,
          runId: activeRunId,
          questions,
        });
        return;
      }

      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to process intake turn." });
    }
  });

  app.get("/api/intake/threads/:threadId", buildThreadState);

  // ---------------------------------------------------------------------------
  // Pipeline: Street View → Marble Labs → .spz
  // ---------------------------------------------------------------------------
  const { startPipelineJob, getJob, listJobs } = await import("./pipeline/manager.js");

  // POST /api/pipeline/start  { lat, lng }  → { jobId }
  app.post("/api/pipeline/start", (req: Request, res: Response) => {
    const { lat, lng } = req.body as { lat?: unknown; lng?: unknown };
    if (typeof lat !== "number" || typeof lng !== "number") {
      res.status(400).json({ error: "lat and lng must be numbers" });
      return;
    }
    const jobId = startPipelineJob(lat, lng);
    res.json({ jobId });
  });

  // GET /api/pipeline/status/:jobId → PipelineJob
  app.get("/api/pipeline/status/:jobId", (req: Request, res: Response) => {
    const jobId = Array.isArray(req.params.jobId) ? req.params.jobId[0] : req.params.jobId;
    const job = getJob(jobId);
    if (!job) { res.status(404).json({ error: "Job not found" }); return; }
    res.json(job);
  });

  // GET /api/pipeline/jobs → PipelineJob[]  (most recent first)
  app.get("/api/pipeline/jobs", (_req: Request, res: Response) => {
    res.json(listJobs());
  });

  return app;
}

// Export for Vercel serverless function
export { createServer };

async function main() {
  validateServerConfig();
  const app = await createServer();
  app.listen(serverConfig.port, () => {
    console.log(`[shot-caller] intake server listening on http://127.0.0.1:${serverConfig.port}`);
  });
}

// Only run main() if this is the entry point (not when imported by Vercel)
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('server/index.ts')) {
  void main().catch((error) => {
    console.error("[shot-caller] failed to start intake server", error);
    process.exitCode = 1;
  });
}
