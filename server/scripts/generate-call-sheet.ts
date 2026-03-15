import "dotenv/config";

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";

import { matchCatalogAssets } from "../call-sheet/catalog.js";
import { normalizeScene } from "../call-sheet/normalize.js";
import { buildCallSheetPdfSpec } from "../call-sheet/pdf-spec.js";
import { createCallSheetPlanner } from "../call-sheet/planner.js";
import { createCallSheetRenderer } from "../call-sheet/render.js";
import { serverConfig, validateServerConfig } from "../config.js";

function defaultOutputPath(scenePath: string): string {
  const parsed = path.parse(scenePath);
  return path.join(parsed.dir || ".", `${parsed.name}-call-sheet.pdf`);
}

async function main() {
  const { values, positionals } = parseArgs({
    options: {
      output: {
        type: "string",
        short: "o",
      },
      title: {
        type: "string",
      },
      location: {
        type: "string",
      },
      "location-address": {
        type: "string",
      },
      "call-time": {
        type: "string",
      },
      "shoot-date": {
        type: "string",
      },
      model: {
        type: "string",
      },
      debug: {
        type: "boolean",
        default: false,
      },
    },
    allowPositionals: true,
  });

  const sceneArg = positionals[0];
  if (!sceneArg) {
    throw new Error("Usage: tsx server/scripts/generate-call-sheet.ts <scene-json-path> [-o output.pdf]");
  }

  validateServerConfig();
  console.log(`[shot-caller] loaded .env and validated provider keys`);
  const model = values.model ?? serverConfig.models.callSheet;
  console.log(`[shot-caller] call-sheet model: ${model}`);

  const scenePath = path.resolve(process.cwd(), sceneArg);
  console.log(`[shot-caller] reading scene export from ${scenePath}`);
  const scene = JSON.parse(await readFile(scenePath, "utf8"));
  const outputPath = path.resolve(process.cwd(), values.output ?? defaultOutputPath(sceneArg));
  console.log(`[shot-caller] output path: ${outputPath}`);

  const metadata = {
    productionTitle: values.title,
    locationName: values.location,
    locationAddress: values["location-address"],
    generalCallTime: values["call-time"],
    shootDate: values["shoot-date"],
    contacts: [],
    notes: [],
    safetyNotes: [],
  };

  console.log("[shot-caller] normalizing scene");
  const normalizedScene = normalizeScene(scene, metadata);

  console.log("[shot-caller] matching asset catalog entries");
  const matchedAssets = await matchCatalogAssets(normalizedScene.placedAssets);
  console.log(`[shot-caller] matched ${matchedAssets.length} catalog-backed assets`);

  console.log("[shot-caller] generating structured call-sheet plan with the LLM");
  const planner = createCallSheetPlanner();
  const { plan } = await planner.generatePlan({
    normalizedScene,
    matchedAssets,
    metadata,
    model,
  });

  console.log("[shot-caller] building deterministic PDF spec");
  const pdfSpec = buildCallSheetPdfSpec(plan, normalizedScene);

  if (values.debug) {
    const debugPath = outputPath.replace(/\.pdf$/i, ".debug.json");
    await writeFile(debugPath, JSON.stringify({
      filename: path.basename(outputPath),
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
    }, null, 2), "utf8");
    console.log(`Call-sheet debug output written to ${debugPath}`);
    return;
  }

  console.log("[shot-caller] rendering PDF with Deno");
  const renderer = createCallSheetRenderer();
  const pdf = await renderer.render(pdfSpec);

  await writeFile(outputPath, pdf);
  console.log(`Call-sheet PDF written to ${outputPath}`);
}

void main().catch((error) => {
  console.error("[shot-caller] failed to generate call sheet", error);
  process.exitCode = 1;
});
