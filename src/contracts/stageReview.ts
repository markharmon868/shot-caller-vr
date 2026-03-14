export const WORLD_DESCRIPTOR_SCHEMA_VERSION = 1 as const;
export const SCENE_DOCUMENT_SCHEMA_VERSION = 1 as const;
export const ASSET_CATALOG_SCHEMA_VERSION = 1 as const;

export type StageReviewMode = "stage4-xr" | "stage5-xr" | "viewer" | "export";
export type SceneStatus = "draft" | "validated" | "approved";
export type SceneElementKind =
  | "camera"
  | "light"
  | "crew"
  | "castMark"
  | "equipment"
  | "setDressing";
export type ReviewIssueSeverity = "low" | "medium" | "high";
export type ReviewIssueStatus = "open" | "resolved";
export type ApprovalStatus = "pending" | "approved" | "rejected";
export type ExportStatus = "idle" | "ready" | "requested";

export interface Vector3Tuple extends Array<number> {
  0: number;
  1: number;
  2: number;
}

export interface Transform3D {
  position: Vector3Tuple;
  rotation: Vector3Tuple;
  scale: Vector3Tuple;
}

export interface WorldBounds {
  min: Vector3Tuple;
  max: Vector3Tuple;
}

export interface WorldDescriptor {
  sceneId: string;
  version: typeof WORLD_DESCRIPTOR_SCHEMA_VERSION;
  unit: "meters";
  splatUrl: string;
  colliderUrl: string;
  assetCatalogUrl: string;
  worldBounds: WorldBounds;
}

export interface ReviewPose {
  position: Vector3Tuple;
  rotation: Vector3Tuple;
}

export interface ReviewIssue {
  id: string;
  sceneRevision: number;
  elementId?: string;
  mode: StageReviewMode;
  note: string;
  severity: ReviewIssueSeverity;
  reviewPose: ReviewPose;
  status: ReviewIssueStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalState {
  status: ApprovalStatus;
  reviewer: string;
  decidedAt: string;
  sceneRevision: number;
  note: string;
}

export interface ExportState {
  status: ExportStatus;
  lastCaptureDataUrl: string;
  requestedAt: string;
  lastPayload: string;
}

export interface CameraElementProperties {
  focalLengthMm: number;
  fovDeg: number;
  rangeMeters: number;
}

export interface LightElementProperties {
  spreadDeg: number;
  rangeMeters: number;
  colorTemperatureKelvin: number;
}

export interface CrewElementProperties {
  role: string;
}

export interface CastMarkElementProperties {
  characterName: string;
}

export interface EquipmentElementProperties {
  clearanceRadiusMeters: number;
}

export interface SetDressingElementProperties {
  clearanceRadiusMeters: number;
}

export interface SceneElementBase {
  id: string;
  kind: SceneElementKind;
  assetId: string;
  label: string;
  transform: Transform3D;
}

export interface CameraSceneElement extends SceneElementBase {
  kind: "camera";
  properties: CameraElementProperties;
}

export interface LightSceneElement extends SceneElementBase {
  kind: "light";
  properties: LightElementProperties;
}

export interface CrewSceneElement extends SceneElementBase {
  kind: "crew";
  properties: CrewElementProperties;
}

export interface CastMarkSceneElement extends SceneElementBase {
  kind: "castMark";
  properties: CastMarkElementProperties;
}

export interface EquipmentSceneElement extends SceneElementBase {
  kind: "equipment";
  properties: EquipmentElementProperties;
}

export interface SetDressingSceneElement extends SceneElementBase {
  kind: "setDressing";
  properties: SetDressingElementProperties;
}

export type SceneElement =
  | CameraSceneElement
  | LightSceneElement
  | CrewSceneElement
  | CastMarkSceneElement
  | EquipmentSceneElement
  | SetDressingSceneElement;

export interface AssetHelperFrustum {
  fovDeg: number;
  rangeMeters: number;
}

export interface AssetHelperCone {
  angleDeg: number;
  rangeMeters: number;
}

export interface AssetHelperMetadata {
  color: string;
  footprintMeters: [number, number];
  heightMeters: number;
  frustum?: AssetHelperFrustum;
  cone?: AssetHelperCone;
}

export interface AssetCatalogEntry {
  id: string;
  kind: SceneElementKind;
  label: string;
  gltfUrl: string;
  defaultScale: Vector3Tuple;
  footprint: [number, number];
  helper: AssetHelperMetadata;
}

export interface AssetCatalogDocument {
  sceneId: string;
  version: typeof ASSET_CATALOG_SCHEMA_VERSION;
  assets: AssetCatalogEntry[];
}

export interface SceneDocument {
  sceneId: string;
  version: typeof SCENE_DOCUMENT_SCHEMA_VERSION;
  worldVersion: number;
  revision: number;
  status: SceneStatus;
  elements: SceneElement[];
  reviewIssues: ReviewIssue[];
  approval: ApprovalState;
  exportState: ExportState;
}

export interface SceneBundle {
  world: WorldDescriptor;
  scene: SceneDocument;
  assets: AssetCatalogDocument;
}

const ELEMENT_KINDS: SceneElementKind[] = [
  "camera",
  "light",
  "crew",
  "castMark",
  "equipment",
  "setDressing",
];
const SCENE_STATUSES: SceneStatus[] = ["draft", "validated", "approved"];
const ISSUE_SEVERITIES: ReviewIssueSeverity[] = ["low", "medium", "high"];
const ISSUE_STATUSES: ReviewIssueStatus[] = ["open", "resolved"];
const APPROVAL_STATUSES: ApprovalStatus[] = ["pending", "approved", "rejected"];
const EXPORT_STATUSES: ExportStatus[] = ["idle", "ready", "requested"];

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function assertString(value: unknown, message: string): asserts value is string {
  assert(typeof value === "string" && value.length > 0, message);
}

function assertNumber(value: unknown, message: string): asserts value is number {
  assert(typeof value === "number" && Number.isFinite(value), message);
}

function assertVector3(
  value: unknown,
  message: string,
): asserts value is Vector3Tuple {
  assert(Array.isArray(value) && value.length === 3, message);
  value.forEach((entry, index) => {
    assertNumber(entry, `${message} [${index}]`);
  });
}

function assertTransform(value: unknown, message: string): asserts value is Transform3D {
  assert(typeof value === "object" && value !== null, message);
  const transform = value as Partial<Transform3D>;
  assertVector3(transform.position, `${message}.position`);
  assertVector3(transform.rotation, `${message}.rotation`);
  assertVector3(transform.scale, `${message}.scale`);
}

function assertEnumValue<T extends string>(
  value: unknown,
  expected: readonly T[],
  message: string,
): asserts value is T {
  assert(typeof value === "string" && expected.includes(value as T), message);
}

function assertReviewPose(value: unknown, message: string): asserts value is ReviewPose {
  assert(typeof value === "object" && value !== null, message);
  const pose = value as Partial<ReviewPose>;
  assertVector3(pose.position, `${message}.position`);
  assertVector3(pose.rotation, `${message}.rotation`);
}

function assertIssue(value: unknown, message: string): asserts value is ReviewIssue {
  assert(typeof value === "object" && value !== null, message);
  const issue = value as Partial<ReviewIssue>;
  assertString(issue.id, `${message}.id`);
  assertNumber(issue.sceneRevision, `${message}.sceneRevision`);
  if (issue.elementId !== undefined && issue.elementId !== "") {
    assertString(issue.elementId, `${message}.elementId`);
  }
  assertEnumValue(
    issue.mode,
    ["stage4-xr", "stage5-xr", "viewer", "export"],
    `${message}.mode`,
  );
  assertString(issue.note, `${message}.note`);
  assertEnumValue(issue.severity, ISSUE_SEVERITIES, `${message}.severity`);
  assertReviewPose(issue.reviewPose, `${message}.reviewPose`);
  assertEnumValue(issue.status, ISSUE_STATUSES, `${message}.status`);
  assertString(issue.createdAt, `${message}.createdAt`);
  assertString(issue.updatedAt, `${message}.updatedAt`);
}

function assertApproval(value: unknown, message: string): asserts value is ApprovalState {
  assert(typeof value === "object" && value !== null, message);
  const approval = value as Partial<ApprovalState>;
  assertEnumValue(approval.status, APPROVAL_STATUSES, `${message}.status`);
  assert(typeof approval.reviewer === "string", `${message}.reviewer`);
  assert(typeof approval.decidedAt === "string", `${message}.decidedAt`);
  assertNumber(approval.sceneRevision, `${message}.sceneRevision`);
  assert(typeof approval.note === "string", `${message}.note`);
}

function assertExportState(value: unknown, message: string): asserts value is ExportState {
  assert(typeof value === "object" && value !== null, message);
  const exportState = value as Partial<ExportState>;
  assertEnumValue(exportState.status, EXPORT_STATUSES, `${message}.status`);
  assert(typeof exportState.lastCaptureDataUrl === "string", `${message}.lastCaptureDataUrl`);
  assert(typeof exportState.requestedAt === "string", `${message}.requestedAt`);
  assert(typeof exportState.lastPayload === "string", `${message}.lastPayload`);
}

function assertAssetHelper(
  value: unknown,
  message: string,
): asserts value is AssetHelperMetadata {
  assert(typeof value === "object" && value !== null, message);
  const helper = value as Partial<AssetHelperMetadata>;
  assertString(helper.color, `${message}.color`);
  assert(
    Array.isArray(helper.footprintMeters) && helper.footprintMeters.length === 2,
    `${message}.footprintMeters`,
  );
  helper.footprintMeters.forEach((entry, index) => {
    assertNumber(entry, `${message}.footprintMeters[${index}]`);
  });
  assertNumber(helper.heightMeters, `${message}.heightMeters`);
  if (helper.frustum) {
    assertNumber(helper.frustum.fovDeg, `${message}.frustum.fovDeg`);
    assertNumber(helper.frustum.rangeMeters, `${message}.frustum.rangeMeters`);
  }
  if (helper.cone) {
    assertNumber(helper.cone.angleDeg, `${message}.cone.angleDeg`);
    assertNumber(helper.cone.rangeMeters, `${message}.cone.rangeMeters`);
  }
}

function assertAssetEntry(
  value: unknown,
  message: string,
): asserts value is AssetCatalogEntry {
  assert(typeof value === "object" && value !== null, message);
  const asset = value as Partial<AssetCatalogEntry>;
  assertString(asset.id, `${message}.id`);
  assertEnumValue(asset.kind, ELEMENT_KINDS, `${message}.kind`);
  assertString(asset.label, `${message}.label`);
  assert(typeof asset.gltfUrl === "string", `${message}.gltfUrl`);
  assertVector3(asset.defaultScale, `${message}.defaultScale`);
  assert(Array.isArray(asset.footprint) && asset.footprint.length === 2, `${message}.footprint`);
  asset.footprint.forEach((entry, index) => {
    assertNumber(entry, `${message}.footprint[${index}]`);
  });
  assertAssetHelper(asset.helper, `${message}.helper`);
}

function assertElement(value: unknown, message: string): asserts value is SceneElement {
  assert(typeof value === "object" && value !== null, message);
  const element = value as Partial<SceneElement>;
  assertString(element.id, `${message}.id`);
  assertEnumValue(element.kind, ELEMENT_KINDS, `${message}.kind`);
  assertString(element.assetId, `${message}.assetId`);
  assertString(element.label, `${message}.label`);
  assertTransform(element.transform, `${message}.transform`);
  assert(typeof element.properties === "object" && element.properties !== null, `${message}.properties`);
}

export function validateWorldDescriptor(value: unknown): WorldDescriptor {
  assert(typeof value === "object" && value !== null, "World descriptor must be an object");
  const world = value as Partial<WorldDescriptor>;
  assertString(world.sceneId, "World descriptor sceneId is required");
  assert(
    world.version === WORLD_DESCRIPTOR_SCHEMA_VERSION,
    `World descriptor version must be ${WORLD_DESCRIPTOR_SCHEMA_VERSION}`,
  );
  assert(world.unit === "meters", "World descriptor unit must be meters");
  assertString(world.splatUrl, "World descriptor splatUrl is required");
  assert(typeof world.colliderUrl === "string", "World descriptor colliderUrl must be a string");
  assertString(world.assetCatalogUrl, "World descriptor assetCatalogUrl is required");
  assert(typeof world.worldBounds === "object" && world.worldBounds !== null, "World bounds are required");
  assertVector3(world.worldBounds.min, "World bounds min is invalid");
  assertVector3(world.worldBounds.max, "World bounds max is invalid");
  return world as WorldDescriptor;
}

export function validateAssetCatalogDocument(value: unknown): AssetCatalogDocument {
  assert(typeof value === "object" && value !== null, "Asset catalog must be an object");
  const catalog = value as Partial<AssetCatalogDocument>;
  assertString(catalog.sceneId, "Asset catalog sceneId is required");
  assert(
    catalog.version === ASSET_CATALOG_SCHEMA_VERSION,
    `Asset catalog version must be ${ASSET_CATALOG_SCHEMA_VERSION}`,
  );
  assert(Array.isArray(catalog.assets), "Asset catalog assets must be an array");
  catalog.assets.forEach((asset, index) => {
    assertAssetEntry(asset, `Asset catalog entry ${index}`);
  });
  return catalog as AssetCatalogDocument;
}

export function validateSceneDocument(value: unknown): SceneDocument {
  assert(typeof value === "object" && value !== null, "Scene document must be an object");
  const scene = value as Partial<SceneDocument>;
  assertString(scene.sceneId, "Scene document sceneId is required");
  assert(
    scene.version === SCENE_DOCUMENT_SCHEMA_VERSION,
    `Scene document version must be ${SCENE_DOCUMENT_SCHEMA_VERSION}`,
  );
  assertNumber(scene.worldVersion, "Scene document worldVersion is required");
  assertNumber(scene.revision, "Scene document revision is required");
  assertEnumValue(scene.status, SCENE_STATUSES, "Scene document status is invalid");
  assert(Array.isArray(scene.elements), "Scene document elements must be an array");
  scene.elements.forEach((element, index) => {
    assertElement(element, `Scene element ${index}`);
  });
  assert(Array.isArray(scene.reviewIssues), "Scene reviewIssues must be an array");
  scene.reviewIssues.forEach((issue, index) => {
    assertIssue(issue, `Review issue ${index}`);
  });
  assertApproval(scene.approval, "Scene approval is invalid");
  assertExportState(scene.exportState, "Scene exportState is invalid");
  return scene as SceneDocument;
}

export function validateSceneBundle(value: unknown): SceneBundle {
  assert(typeof value === "object" && value !== null, "Scene bundle must be an object");
  const bundle = value as Partial<SceneBundle>;
  const world = validateWorldDescriptor(bundle.world);
  const scene = validateSceneDocument(bundle.scene);
  const assets = validateAssetCatalogDocument(bundle.assets);
  assert(
    world.sceneId === scene.sceneId && scene.sceneId === assets.sceneId,
    "Scene bundle scene ids do not match",
  );
  assert(
    scene.worldVersion === world.version,
    "Scene document worldVersion does not match world descriptor version",
  );
  return { world, scene, assets };
}
