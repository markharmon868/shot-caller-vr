import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

import type { CallSheetGenerateRequest, CallSheetPlan, PdfSpec } from "../shared/contracts/call-sheet.ts";
import { createCallSheetGenerateHandler } from "../server/index.ts";
import { matchCatalogAssets } from "../server/call-sheet/catalog.ts";
import { normalizeScene } from "../server/call-sheet/normalize.ts";
import { buildCallSheetPdfSpec } from "../server/call-sheet/pdf-spec.ts";
import { createCallSheetRenderer, CallSheetRenderError } from "../server/call-sheet/render.ts";
import { createCallSheetService } from "../server/call-sheet/service.ts";

async function loadSampleScene() {
  const filePath = path.resolve(process.cwd(), "shot-caller-scene-demo (1).json");
  return JSON.parse(await readFile(filePath, "utf8"));
}

function createPlan(overrides: Partial<CallSheetPlan> = {}): CallSheetPlan {
  return {
    titleBlock: {
      productionTitle: "Demo Production",
      sceneTitle: "Untitled Scene",
      sceneId: "demo",
      shootDate: "TBD",
      locationName: "Derived From Scene",
      locationAddress: "Unknown",
      generalCallTime: "TBD",
    },
    executiveSummary: ["This is a grounded summary based on the exported scene geometry."],
    shots: [
      {
        shotId: "SHOT-1",
        shotLabel: "Master",
        shotType: "wide",
        cameraSetupSummary: "Camera 2 at 35mm covering the overall geography.",
        relatedLights: ["Light 2"],
        relatedAssets: ["ARRI ALEXA Mini LF", "Chapman Hybrid II Dolly"],
        relatedProps: [],
        blockingNotes: ["Keep the actor and vehicle in the same visual axis."],
        estimatedSetupNotes: ["Allow space for dolly approach and operator reset."],
        assumptionsUsed: ["Shot label inferred from lack of explicit metadata."],
        inferred: true,
      },
    ],
    assets: [
      {
        label: "ARRI ALEXA Mini LF",
        category: "camera",
        quantity: 1,
        dailyRate: 1200,
        weeklyRate: 4800,
        source: "catalog",
        confidence: "high",
        notes: [],
      },
    ],
    costSummary: {
      dailyTotal: 1200,
      weeklyTotal: 4800,
      pricingNotes: ["Matched by GLTF URL."],
    },
    placementSummary: [
      {
        label: "Camera 2",
        coordinates: "(-1.27, 0.00, -0.48)",
        notes: ["Faces the primary action area."],
      },
    ],
    departmentNotes: [
      {
        department: "Camera",
        notes: ["Prep dolly move and lensing before crew call."],
      },
    ],
    riskAndSafetyNotes: ["Vehicle movement needs a locked-off pedestrian buffer."],
    assumptions: ["Location logistics were not supplied and remain inferred."],
    openQuestions: ["Confirm actual shoot date and location logistics."],
    ...overrides,
  };
}

test("normalizeScene summarizes the exported demo scene", async () => {
  const scene = await loadSampleScene();
  const normalized = normalizeScene(scene, {});

  assert.equal(normalized.sceneId, "demo");
  assert.equal(normalized.elementCounts.total, 7);
  assert.equal(normalized.elementCounts.cameras, 1);
  assert.equal(normalized.elementCounts.lights, 1);
  assert.ok(normalized.unresolvedFacts.some((fact) => /shot number/i.test(fact)));
});

test("matchCatalogAssets finds catalog-backed assets in the demo scene", async () => {
  const scene = await loadSampleScene();
  const normalized = normalizeScene(scene, {});
  const matches = await matchCatalogAssets(normalized.placedAssets);

  assert.ok(matches.some((match) => match.displayName === "ARRI ALEXA Mini LF"));
  assert.ok(matches.some((match) => match.displayName === "Chapman Hybrid II Dolly"));
});

test("buildCallSheetPdfSpec creates fixed pages for summary, costs, shots, and notes", async () => {
  const scene = await loadSampleScene();
  const normalized = normalizeScene(scene, {});
  const spec = buildCallSheetPdfSpec(createPlan(), normalized);

  assert.equal(spec.pages.length, 4);
  assert.equal(spec.pages[0]?.size, "Letter");
  assert.equal(spec.pages[2]?.elements[0]?.type, "text");
});

test("createCallSheetService returns debug payload without rendering a PDF", async () => {
  const scene = await loadSampleScene();
  const fakePlan = createPlan();
  const service = createCallSheetService({
    planner: {
      async generatePlan() {
        return { plan: fakePlan, prompt: "prompt" };
      },
    },
    renderer: {
      async render() {
        throw new Error("renderer should not be used in debug mode");
      },
    },
    matchAssets: async () => [],
    buildPdfSpec: () => ({
      title: "Debug PDF",
      author: "Shot Caller",
      pages: [{ size: "Letter", elements: [] }],
    }),
  });

  const result = await service.generate({
    scene,
    options: { debug: true },
  });

  assert.equal(result.kind, "debug");
  if (result.kind === "debug") {
    assert.match(result.payload.filename, /call-sheet\.pdf$/);
    assert.equal(result.payload.plan.titleBlock.productionTitle, "Demo Production");
  }
});

test("createCallSheetService returns PDF bytes when renderer succeeds", async () => {
  const scene = await loadSampleScene();
  const pdfBytes = Buffer.from("%PDF-1.7");
  const service = createCallSheetService({
    planner: {
      async generatePlan() {
        return { plan: createPlan(), prompt: "prompt" };
      },
    },
    renderer: {
      async render() {
        return pdfBytes;
      },
    },
    matchAssets: async () => [],
    buildPdfSpec: () => ({
      title: "Rendered PDF",
      author: "Shot Caller",
      pages: [{ size: "Letter", elements: [] }],
    }),
  });

  const result = await service.generate({ scene });

  assert.equal(result.kind, "pdf");
  if (result.kind === "pdf") {
    assert.equal(result.pdf.equals(pdfBytes), true);
    assert.match(result.filename, /call-sheet\.pdf$/);
  }
});

test("createCallSheetRenderer reports a missing renderer script clearly", async () => {
  const renderer = createCallSheetRenderer({ scriptPath: "/tmp/does-not-exist-renderer.mjs" });
  const spec: PdfSpec = {
    title: "Test PDF",
    author: "Shot Caller",
    pages: [{ size: "Letter", elements: [] }],
  };

  await assert.rejects(
    renderer.render(spec),
    (error: unknown) =>
      error instanceof CallSheetRenderError
      && /renderer script not found/i.test(error.message),
  );
});

test("POST /api/call-sheet/generate returns debug JSON with a mocked service", async () => {
  const scene = await loadSampleScene();
  const handler = createCallSheetGenerateHandler({
    async generate(request: CallSheetGenerateRequest) {
      assert.equal(request.options?.debug, true);
      return {
        kind: "debug",
        payload: {
          filename: "demo-call-sheet.pdf",
          normalizedScene: {
            sceneId: "demo",
            sceneTitle: "Untitled Scene",
            elementCounts: {
              total: 7,
              cameras: 1,
              lights: 1,
              gltf: 4,
              equipment: 1,
              props: 0,
              castMarks: 0,
              crew: 0,
            },
            sceneSummary: ["summary"],
            unresolvedFacts: ["fact"],
          },
          matchedAssets: [],
          plan: createPlan(),
          pdfSpec: {
            title: "Debug PDF",
            author: "Shot Caller",
            pages: [{ size: "Letter", elements: [] }],
          },
        },
      };
    },
  });

  const response = createMockResponse();
  await handler({ body: { scene, options: { debug: true } } } as never, response as never);

  assert.equal(response.statusCode, 200);
  assert.equal(response.jsonBody?.filename, "demo-call-sheet.pdf");
});

test("POST /api/call-sheet/generate returns PDF bytes with a mocked service", async () => {
  const scene = await loadSampleScene();
  const handler = createCallSheetGenerateHandler({
    async generate() {
      return {
        kind: "pdf",
        filename: "demo-call-sheet.pdf",
        pdf: Buffer.from("%PDF-1.7 mock"),
      };
    },
  });

  const response = createMockResponse();
  await handler({ body: { scene } } as never, response as never);

  assert.equal(response.statusCode, 200);
  assert.equal(response.typeValue, "application/pdf");
  assert.match(response.headers["content-disposition"] ?? "", /demo-call-sheet\.pdf/);
  assert.equal(response.sendBody?.equals(Buffer.from("%PDF-1.7 mock")), true);
});

function createMockResponse() {
  return {
    statusCode: 200,
    headers: {} as Record<string, string>,
    jsonBody: undefined as unknown,
    sendBody: undefined as Buffer | undefined,
    typeValue: undefined as string | undefined,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.jsonBody = payload;
      return this;
    },
    type(value: string) {
      this.typeValue = value;
      return this;
    },
    set(name: string, value: string) {
      this.headers[name.toLowerCase()] = value;
      return this;
    },
    send(payload: Buffer) {
      this.sendBody = payload;
      return this;
    },
  };
}
