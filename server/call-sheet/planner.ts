import { Agent } from "@mastra/core/agent";

import {
  type CallSheetPlan,
  CallSheetPlanSchema,
  type CallSheetMetadata,
} from "../../shared/contracts/call-sheet.js";
import type { NormalizedCatalogMatch } from "./catalog.js";
import type { NormalizedScene } from "./normalize.js";

export interface CallSheetPlannerInput {
  normalizedScene: NormalizedScene;
  matchedAssets: NormalizedCatalogMatch[];
  metadata: CallSheetMetadata;
  model: string;
}

export interface CallSheetPlanner {
  generatePlan(input: CallSheetPlannerInput): Promise<{
    plan: CallSheetPlan;
    prompt: string;
  }>;
}

export class CallSheetPlannerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CallSheetPlannerError";
  }
}

function buildPrompt(input: CallSheetPlannerInput): string {
  return [
    "Generate a planning-oriented film call sheet from the provided grounded data.",
    "You must stay grounded in the scene export, the matched asset catalog rows, and the optional production metadata.",
    "Never invent hard logistics facts such as exact addresses, contact numbers, call times, weather, hospital details, or department staffing unless they are explicitly provided.",
    "When required title-block fields such as locationAddress or generalCallTime are missing, use concise placeholders like 'TBD' and capture the uncertainty in assumptions or openQuestions.",
    "You may make practical planning inferences when necessary, but every such inference must be surfaced in the assumptions list and in the relevant shot if it affects that shot.",
    "If shot metadata is sparse, prefer one shot per logical camera and mark that shot as inferred.",
    "Separate facts from assumptions. Missing facts should become either assumptions or open questions, not fabricated certainties.",
    "Keep the output concise, useful, and operationally specific for a director, 1st AD, DP, and key department heads.",
    "Return only structured output.",
    "",
    "Optional production metadata:",
    JSON.stringify(input.metadata, null, 2),
    "",
    "Normalized scene facts:",
    JSON.stringify({
      sceneId: input.normalizedScene.sceneId,
      sceneTitle: input.normalizedScene.sceneTitle,
      savedAt: input.normalizedScene.savedAt,
      splatUrl: input.normalizedScene.splatUrl,
      splatOffset: input.normalizedScene.splatOffset,
      elementCounts: input.normalizedScene.elementCounts,
      sceneSummary: input.normalizedScene.sceneSummary,
      placementFacts: input.normalizedScene.placementFacts,
      unresolvedFacts: input.normalizedScene.unresolvedFacts,
      cameras: input.normalizedScene.cameras,
      lights: input.normalizedScene.lights,
      placedAssets: input.normalizedScene.placedAssets.map((asset) => ({
        id: asset.id,
        type: asset.type,
        name: asset.name,
        position: asset.position,
        rotationY: asset.rotationY,
        semanticHints: asset.semanticHints,
        gltfUrl: asset.gltfUrl,
        fileName: asset.fileName,
        equipType: asset.equipType,
      })),
    }, null, 2),
    "",
    "Matched asset catalog rows:",
    JSON.stringify(input.matchedAssets, null, 2),
  ].join("\n");
}

export function createCallSheetPlanner(): CallSheetPlanner {
  return {
    async generatePlan(input) {
      const prompt = buildPrompt(input);
      const agent = new Agent({
        id: "call-sheet-planner",
        name: "Shot Caller Call Sheet Planner",
        instructions: [
          "Produce a shotwise call-sheet plan from structured filmmaking scene data.",
          "Honor the provided schema exactly.",
          "The assumptions array must contain every planning inference that is not explicitly present in the input.",
          "Use openQuestions for missing production information that a coordinator or AD should still resolve.",
          "Each asset entry should reflect a real matched catalog item or a grounded fallback item from the input.",
          "Each shot should include concise blocking and setup guidance tied to the actual scene geometry and equipment.",
          "Do not use markdown.",
        ].join("\n"),
        model: input.model,
      });

      const output = await agent.generate([
        {
          role: "user",
          content: prompt,
        },
      ], {
        structuredOutput: {
          schema: CallSheetPlanSchema,
        },
        maxSteps: 1,
      });

      let planPayload: unknown = output.object;
      if (planPayload === undefined) {
        const rawText = typeof output.text === "string" ? output.text.trim() : "";
        if (rawText.length > 0) {
          try {
            planPayload = JSON.parse(rawText);
          } catch {
            throw new CallSheetPlannerError(
              `Call-sheet planner did not return structured output, and its text response was not valid JSON. Raw text: ${rawText.slice(0, 500)}`,
            );
          }
        }
      }

      if (planPayload === undefined) {
        throw new CallSheetPlannerError(
          "Call-sheet planner did not return any structured output. Try a different model or inspect the raw provider response.",
        );
      }

      return {
        plan: CallSheetPlanSchema.parse(planPayload),
        prompt,
      };
    },
  };
}
