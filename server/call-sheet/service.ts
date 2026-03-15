import type {
  CallSheetDebugResponse,
  CallSheetGenerateRequest,
  CallSheetPlan,
  PdfSpec,
} from "../../shared/contracts/call-sheet.js";
import {
  CallSheetDebugResponseSchema,
  CallSheetGenerateRequestSchema,
} from "../../shared/contracts/call-sheet.js";
import { serverConfig } from "../config.js";
import type { NormalizedCatalogMatch } from "./catalog.js";
import { matchCatalogAssets } from "./catalog.js";
import { normalizeScene, type NormalizedScene } from "./normalize.js";
import { buildCallSheetPdfSpec } from "./pdf-spec.js";
import { createCallSheetPlanner, type CallSheetPlanner } from "./planner.js";
import { createCallSheetRenderer, type CallSheetRenderer } from "./render.js";

export class CallSheetBadRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CallSheetBadRequestError";
  }
}

export interface GeneratedCallSheetPdfResult {
  kind: "pdf";
  filename: string;
  pdf: Buffer;
}

export interface GeneratedCallSheetDebugResult {
  kind: "debug";
  payload: CallSheetDebugResponse;
}

export type GeneratedCallSheetResult = GeneratedCallSheetPdfResult | GeneratedCallSheetDebugResult;

export interface CallSheetService {
  generate(request: CallSheetGenerateRequest): Promise<GeneratedCallSheetResult>;
}

export interface CallSheetServiceDeps {
  planner: CallSheetPlanner;
  renderer: CallSheetRenderer;
  matchAssets: (assets: NormalizedScene["placedAssets"]) => Promise<NormalizedCatalogMatch[]>;
  buildPdfSpec: (plan: CallSheetPlan, normalizedScene: NormalizedScene) => PdfSpec;
}

function slugifyFileStem(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "shot-caller";
}

function buildFilename(normalizedScene: NormalizedScene): string {
  const title = normalizedScene.metadata.productionTitle ?? normalizedScene.sceneTitle ?? normalizedScene.sceneId;
  return `${slugifyFileStem(title)}-call-sheet.pdf`;
}

export function createCallSheetService(deps?: Partial<CallSheetServiceDeps>): CallSheetService {
  const planner = deps?.planner ?? createCallSheetPlanner();
  const renderer = deps?.renderer ?? createCallSheetRenderer();
  const matchAssets = deps?.matchAssets ?? matchCatalogAssets;
  const buildPdfSpec = deps?.buildPdfSpec ?? buildCallSheetPdfSpec;

  return {
    async generate(rawRequest) {
      const request = CallSheetGenerateRequestSchema.parse(rawRequest);
      const metadata = request.metadata ?? {
        contacts: [],
        notes: [],
        safetyNotes: [],
      };
      const normalizedScene = normalizeScene(request.scene, metadata);

      if (normalizedScene.elementCounts.total === 0) {
        throw new CallSheetBadRequestError("Scene export must include at least one element.");
      }

      const matchedAssets = await matchAssets(normalizedScene.placedAssets);
      const model = request.options?.model ?? serverConfig.models.callSheet;
      const { plan } = await planner.generatePlan({
        normalizedScene,
        matchedAssets,
        metadata,
        model,
      });

      const pdfSpec = buildPdfSpec(plan, normalizedScene);
      const filename = buildFilename(normalizedScene);

      if (request.options?.debug) {
        return {
          kind: "debug",
          payload: CallSheetDebugResponseSchema.parse({
            filename,
            normalizedScene: {
              sceneId: normalizedScene.sceneId,
              sceneTitle: normalizedScene.sceneTitle,
              elementCounts: normalizedScene.elementCounts,
              sceneSummary: normalizedScene.sceneSummary,
              unresolvedFacts: normalizedScene.unresolvedFacts,
            },
            matchedAssets,
            plan,
            pdfSpec,
          }),
        };
      }

      const pdf = await renderer.render(pdfSpec);
      return {
        kind: "pdf",
        filename,
        pdf,
      };
    },
  };
}
