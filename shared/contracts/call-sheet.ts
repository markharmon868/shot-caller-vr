import { z } from "zod";

const Vector3Schema = z.tuple([z.number(), z.number(), z.number()]);

const BaseSceneElementSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  position: Vector3Schema,
  rotationY: z.number(),
  scale: Vector3Schema,
});

export const CameraPropertiesSchema = z.object({
  focalLength: z.number(),
  aspectRatio: z.number(),
  fovDistance: z.number(),
  shotNumber: z.number().nullable(),
  shotType: z.string(),
  shotLabel: z.string(),
  setupGroup: z.string(),
});

export const LightPropertiesSchema = z.object({
  colorTemp: z.number(),
  coneAngle: z.number(),
  coneDistance: z.number(),
  setupGroup: z.string(),
});

export const CrewPropertiesSchema = z.object({
  department: z.string(),
});

export const GltfPropertiesSchema = z.object({
  url: z.string(),
  fileName: z.string(),
});

export const CastMarkPropertiesSchema = z.object({
  actorName: z.string(),
  sceneNumber: z.string(),
});

export const PropsPropertiesSchema = z.object({
  description: z.string(),
  quantity: z.number(),
  width: z.number(),
  height: z.number(),
  depth: z.number(),
});

export const EquipmentPropertiesSchema = z.object({
  equipType: z.string(),
});

export const CameraSceneElementSchema = BaseSceneElementSchema.extend({
  type: z.literal("camera"),
  properties: CameraPropertiesSchema,
});

export const LightSceneElementSchema = BaseSceneElementSchema.extend({
  type: z.literal("light"),
  properties: LightPropertiesSchema,
});

export const CrewSceneElementSchema = BaseSceneElementSchema.extend({
  type: z.literal("crew"),
  properties: CrewPropertiesSchema,
});

export const GltfSceneElementSchema = BaseSceneElementSchema.extend({
  type: z.literal("gltf"),
  properties: GltfPropertiesSchema,
});

export const CastMarkSceneElementSchema = BaseSceneElementSchema.extend({
  type: z.literal("cast_mark"),
  properties: CastMarkPropertiesSchema,
});

export const PropsSceneElementSchema = BaseSceneElementSchema.extend({
  type: z.literal("props"),
  properties: PropsPropertiesSchema,
});

export const EquipmentSceneElementSchema = BaseSceneElementSchema.extend({
  type: z.literal("equipment"),
  properties: EquipmentPropertiesSchema,
});

export const SceneElementSchema = z.discriminatedUnion("type", [
  CameraSceneElementSchema,
  LightSceneElementSchema,
  CrewSceneElementSchema,
  GltfSceneElementSchema,
  CastMarkSceneElementSchema,
  PropsSceneElementSchema,
  EquipmentSceneElementSchema,
]);

export const ExportedSceneSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  splatUrl: z.string().min(1),
  splatOffset: Vector3Schema,
  elements: z.array(SceneElementSchema),
  savedAt: z.string().datetime(),
});

export type ExportedScene = z.infer<typeof ExportedSceneSchema>;
export type SceneElement = z.infer<typeof SceneElementSchema>;
export type CameraSceneElement = z.infer<typeof CameraSceneElementSchema>;
export type LightSceneElement = z.infer<typeof LightSceneElementSchema>;
export type GltfSceneElement = z.infer<typeof GltfSceneElementSchema>;
export type EquipmentSceneElement = z.infer<typeof EquipmentSceneElementSchema>;

export const CallSheetContactSchema = z.object({
  role: z.string().trim().min(1),
  name: z.string().trim().min(1),
  phone: z.string().trim().min(1).optional(),
  email: z.string().trim().email().optional(),
});

export const CallSheetHospitalInfoSchema = z.object({
  name: z.string().trim().min(1),
  address: z.string().trim().min(1).optional(),
  phone: z.string().trim().min(1).optional(),
});

export const CallSheetMetadataSchema = z.object({
  productionTitle: z.string().trim().min(1).optional(),
  shootDate: z.string().trim().min(1).optional(),
  locationName: z.string().trim().min(1).optional(),
  locationAddress: z.string().trim().min(1).optional(),
  generalCallTime: z.string().trim().min(1).optional(),
  contacts: z.array(CallSheetContactSchema).default([]),
  notes: z.array(z.string().trim().min(1)).default([]),
  safetyNotes: z.array(z.string().trim().min(1)).default([]),
  weatherSummary: z.string().trim().min(1).optional(),
  companyMove: z.string().trim().min(1).optional(),
  parkingNotes: z.string().trim().min(1).optional(),
  hospitalInfo: CallSheetHospitalInfoSchema.optional(),
});

export type CallSheetMetadata = z.infer<typeof CallSheetMetadataSchema>;

export const CallSheetGenerateOptionsSchema = z.object({
  debug: z.boolean().default(false),
  model: z.string().trim().min(1).optional(),
});

export type CallSheetGenerateOptions = z.infer<typeof CallSheetGenerateOptionsSchema>;

export const CallSheetGenerateRequestSchema = z.object({
  scene: ExportedSceneSchema,
  metadata: CallSheetMetadataSchema.optional(),
  options: CallSheetGenerateOptionsSchema.optional(),
});

export type CallSheetGenerateRequest = z.infer<typeof CallSheetGenerateRequestSchema>;

export const CallSheetPlanTitleBlockSchema = z.object({
  productionTitle: z.string().min(1),
  sceneTitle: z.string().min(1),
  sceneId: z.string().min(1),
  shootDate: z.string().min(1),
  locationName: z.string().min(1),
  locationAddress: z.string().min(1),
  generalCallTime: z.string().min(1),
});

export const CallSheetPlanShotSchema = z.object({
  shotId: z.string().min(1),
  shotLabel: z.string().min(1),
  shotType: z.string().min(1),
  cameraSetupSummary: z.string().min(1),
  relatedLights: z.array(z.string().min(1)),
  relatedAssets: z.array(z.string().min(1)),
  relatedProps: z.array(z.string().min(1)),
  blockingNotes: z.array(z.string().min(1)),
  estimatedSetupNotes: z.array(z.string().min(1)),
  assumptionsUsed: z.array(z.string().min(1)),
  inferred: z.boolean(),
});

export const CallSheetPlanAssetSchema = z.object({
  label: z.string().min(1),
  category: z.string().min(1),
  quantity: z.number().int().positive(),
  dailyRate: z.number().nonnegative(),
  weeklyRate: z.number().nonnegative(),
  source: z.string().min(1),
  confidence: z.enum(["high", "medium", "low"]),
  notes: z.array(z.string().min(1)),
});

export const CallSheetPlanCostSummarySchema = z.object({
  dailyTotal: z.number().nonnegative(),
  weeklyTotal: z.number().nonnegative(),
  pricingNotes: z.array(z.string().min(1)),
});

export const CallSheetPlanPlacementItemSchema = z.object({
  label: z.string().min(1),
  coordinates: z.string().min(1),
  notes: z.array(z.string().min(1)),
});

export const CallSheetPlanDepartmentNoteSchema = z.object({
  department: z.string().min(1),
  notes: z.array(z.string().min(1)),
});

export const CallSheetPlanSchema = z.object({
  titleBlock: CallSheetPlanTitleBlockSchema,
  executiveSummary: z.array(z.string().min(1)).min(1),
  shots: z.array(CallSheetPlanShotSchema),
  assets: z.array(CallSheetPlanAssetSchema),
  costSummary: CallSheetPlanCostSummarySchema,
  placementSummary: z.array(CallSheetPlanPlacementItemSchema),
  departmentNotes: z.array(CallSheetPlanDepartmentNoteSchema),
  riskAndSafetyNotes: z.array(z.string().min(1)),
  assumptions: z.array(z.string().min(1)),
  openQuestions: z.array(z.string().min(1)),
});

export type CallSheetPlan = z.infer<typeof CallSheetPlanSchema>;

export const PdfColorSchema = z.object({
  r: z.number().min(0).max(1),
  g: z.number().min(0).max(1),
  b: z.number().min(0).max(1),
});

export const PdfTextElementSchema = z.object({
  type: z.literal("text"),
  x: z.number(),
  y: z.number(),
  text: z.string(),
  fontSize: z.number().positive(),
  font: z.enum([
    "Helvetica",
    "HelveticaBold",
    "HelveticaOblique",
    "TimesRoman",
    "TimesBold",
    "Courier",
    "CourierBold",
  ]).optional(),
  color: PdfColorSchema.optional(),
  maxWidth: z.number().positive().optional(),
  lineHeight: z.number().positive().optional(),
  rotate: z.number().optional(),
});

export const PdfLineElementSchema = z.object({
  type: z.literal("line"),
  startX: z.number(),
  startY: z.number(),
  endX: z.number(),
  endY: z.number(),
  thickness: z.number().positive().optional(),
  color: PdfColorSchema.optional(),
});

export const PdfRectangleElementSchema = z.object({
  type: z.literal("rectangle"),
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  color: PdfColorSchema.optional(),
  borderColor: PdfColorSchema.optional(),
  borderWidth: z.number().nonnegative().optional(),
});

export const PdfTableElementSchema = z.object({
  type: z.literal("table"),
  x: z.number(),
  y: z.number(),
  rows: z.array(z.array(z.string())),
  columnWidths: z.array(z.number().positive()),
  rowHeight: z.number().positive(),
  headerBackground: PdfColorSchema.optional(),
  padding: z.number().nonnegative().optional(),
  fontSize: z.number().positive().optional(),
});

export const PdfElementSchema = z.union([
  PdfTextElementSchema,
  PdfLineElementSchema,
  PdfRectangleElementSchema,
  PdfTableElementSchema,
]);

export const PdfPageSchema = z.object({
  size: z.union([
    z.enum(["A4", "Letter", "Legal"]),
    z.tuple([z.number().positive(), z.number().positive()]),
  ]),
  elements: z.array(PdfElementSchema),
});

export const PdfSpecSchema = z.object({
  title: z.string().min(1),
  author: z.string().min(1),
  pages: z.array(PdfPageSchema).min(1),
});

export type PdfSpec = z.infer<typeof PdfSpecSchema>;

export const NormalizedCatalogMatchSchema = z.object({
  elementId: z.string().min(1),
  elementType: z.string().min(1),
  elementName: z.string().min(1),
  catalogItemId: z.string().min(1),
  catalogCategoryId: z.string().min(1),
  displayName: z.string().min(1),
  dailyRate: z.number().nonnegative(),
  weeklyRate: z.number().nonnegative(),
  confidence: z.enum(["high", "medium", "low"]),
  source: z.enum(["gltfUrl", "name", "equipType"]),
});

export const NormalizedSceneDebugSchema = z.object({
  sceneId: z.string().min(1),
  sceneTitle: z.string().min(1),
  elementCounts: z.object({
    total: z.number().int().nonnegative(),
    cameras: z.number().int().nonnegative(),
    lights: z.number().int().nonnegative(),
    gltf: z.number().int().nonnegative(),
    equipment: z.number().int().nonnegative(),
    props: z.number().int().nonnegative(),
    castMarks: z.number().int().nonnegative(),
    crew: z.number().int().nonnegative(),
  }),
  sceneSummary: z.array(z.string().min(1)),
  unresolvedFacts: z.array(z.string().min(1)),
});

export const CallSheetDebugResponseSchema = z.object({
  filename: z.string().min(1),
  normalizedScene: NormalizedSceneDebugSchema,
  matchedAssets: z.array(NormalizedCatalogMatchSchema),
  plan: CallSheetPlanSchema,
  pdfSpec: PdfSpecSchema,
});

export type CallSheetDebugResponse = z.infer<typeof CallSheetDebugResponseSchema>;
