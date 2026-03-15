import type {
  CallSheetMetadata,
  CameraSceneElement,
  EquipmentSceneElement,
  ExportedScene,
  GltfSceneElement,
  LightSceneElement,
} from "../../shared/contracts/call-sheet.js";
import { ExportedSceneSchema } from "../../shared/contracts/call-sheet.js";

export interface NormalizedCamera {
  id: string;
  name: string;
  position: [number, number, number];
  rotationY: number;
  focalLength: number;
  aspectRatio: number;
  fovDistance: number;
  shotNumber: number | null;
  shotType: string;
  shotLabel: string;
  setupGroup: string;
  inferredShotId: string;
}

export interface NormalizedLight {
  id: string;
  name: string;
  position: [number, number, number];
  rotationY: number;
  colorTemp: number;
  coneAngle: number;
  coneDistance: number;
  setupGroup: string;
}

export interface NormalizedPlacedAsset {
  id: string;
  type: "gltf" | "equipment" | "props" | "cast_mark" | "crew";
  name: string;
  position: [number, number, number];
  rotationY: number;
  semanticHints: string[];
  gltfUrl?: string;
  fileName?: string;
  equipType?: string;
  rawProperties: Record<string, unknown>;
}

export interface NormalizedScene {
  sceneId: string;
  sceneTitle: string;
  savedAt: string;
  splatUrl: string;
  splatOffset: [number, number, number];
  metadata: CallSheetMetadata;
  elementCounts: {
    total: number;
    cameras: number;
    lights: number;
    gltf: number;
    equipment: number;
    props: number;
    castMarks: number;
    crew: number;
  };
  cameras: NormalizedCamera[];
  lights: NormalizedLight[];
  placedAssets: NormalizedPlacedAsset[];
  sceneSummary: string[];
  placementFacts: string[];
  unresolvedFacts: string[];
}

function formatCoordinate(value: number): string {
  return value.toFixed(2);
}

function formatPosition(position: [number, number, number]): string {
  return `(${formatCoordinate(position[0])}, ${formatCoordinate(position[1])}, ${formatCoordinate(position[2])})`;
}

function buildSemanticHints(name: string): string[] {
  const normalized = name.toLowerCase();
  const hints = new Set<string>();

  if (/(camera|arri|sony|red|alexa)/.test(normalized)) {
    hints.add("camera-gear");
  }
  if (/(dolly|gimbal|tripod|cstand|c-stand|stand|grip)/.test(normalized)) {
    hints.add("support-gear");
  }
  if (/(car|vehicle|truck|van|aztek)/.test(normalized)) {
    hints.add("vehicle");
  }
  if (/(actor|character|walter|person)/.test(normalized)) {
    hints.add("character");
  }
  if (/(light|skypanel|aputure|source)/.test(normalized)) {
    hints.add("lighting");
  }

  return Array.from(hints);
}

function normalizeCamera(camera: CameraSceneElement, index: number): NormalizedCamera {
  const shotNumber = camera.properties.shotNumber;
  const inferredShotId = shotNumber !== null ? `SHOT-${shotNumber}` : `SHOT-${index + 1}`;

  return {
    id: camera.id,
    name: camera.name,
    position: camera.position,
    rotationY: camera.rotationY,
    focalLength: camera.properties.focalLength,
    aspectRatio: camera.properties.aspectRatio,
    fovDistance: camera.properties.fovDistance,
    shotNumber,
    shotType: camera.properties.shotType.trim(),
    shotLabel: camera.properties.shotLabel.trim(),
    setupGroup: camera.properties.setupGroup.trim(),
    inferredShotId,
  };
}

function normalizeLight(light: LightSceneElement): NormalizedLight {
  return {
    id: light.id,
    name: light.name,
    position: light.position,
    rotationY: light.rotationY,
    colorTemp: light.properties.colorTemp,
    coneAngle: light.properties.coneAngle,
    coneDistance: light.properties.coneDistance,
    setupGroup: light.properties.setupGroup.trim(),
  };
}

function normalizeGltfAsset(element: GltfSceneElement): NormalizedPlacedAsset {
  return {
    id: element.id,
    type: "gltf",
    name: element.name,
    position: element.position,
    rotationY: element.rotationY,
    semanticHints: buildSemanticHints(`${element.name} ${element.properties.fileName}`),
    gltfUrl: element.properties.url,
    fileName: element.properties.fileName,
    rawProperties: element.properties,
  };
}

function normalizeEquipmentAsset(element: EquipmentSceneElement): NormalizedPlacedAsset {
  return {
    id: element.id,
    type: "equipment",
    name: element.name,
    position: element.position,
    rotationY: element.rotationY,
    semanticHints: buildSemanticHints(`${element.name} ${element.properties.equipType}`),
    equipType: element.properties.equipType,
    rawProperties: element.properties,
  };
}

export function normalizeScene(input: ExportedScene, metadata: CallSheetMetadata = {
  contacts: [],
  notes: [],
  safetyNotes: [],
}): NormalizedScene {
  const scene = ExportedSceneSchema.parse(input);

  const cameras = scene.elements
    .filter((element): element is CameraSceneElement => element.type === "camera")
    .map(normalizeCamera);

  const lights = scene.elements
    .filter((element): element is LightSceneElement => element.type === "light")
    .map(normalizeLight);

  const placedAssets: NormalizedPlacedAsset[] = [];
  for (const element of scene.elements) {
    if (element.type === "gltf") {
      placedAssets.push(normalizeGltfAsset(element));
      continue;
    }
    if (element.type === "equipment") {
      placedAssets.push(normalizeEquipmentAsset(element));
      continue;
    }
    if (element.type === "props") {
      placedAssets.push({
        id: element.id,
        type: "props",
        name: element.name,
        position: element.position,
        rotationY: element.rotationY,
        semanticHints: buildSemanticHints(`${element.name} ${element.properties.description}`),
        rawProperties: element.properties,
      });
      continue;
    }
    if (element.type === "cast_mark") {
      placedAssets.push({
        id: element.id,
        type: "cast_mark",
        name: element.name,
        position: element.position,
        rotationY: element.rotationY,
        semanticHints: buildSemanticHints(`${element.name} ${element.properties.actorName}`),
        rawProperties: element.properties,
      });
      continue;
    }
    if (element.type === "crew") {
      placedAssets.push({
        id: element.id,
        type: "crew",
        name: element.name,
        position: element.position,
        rotationY: element.rotationY,
        semanticHints: buildSemanticHints(`${element.name} ${element.properties.department}`),
        rawProperties: element.properties,
      });
    }
  }

  const sceneSummary = [
    `${scene.title} contains ${scene.elements.length} placed elements.`,
    cameras.length > 0
      ? `${cameras.length} camera setup${cameras.length === 1 ? "" : "s"} detected.`
      : "No explicit camera setups are annotated in the export.",
    lights.length > 0
      ? `${lights.length} light source${lights.length === 1 ? "" : "s"} detected.`
      : "No explicit lighting fixtures are annotated in the export.",
    placedAssets.length > 0
      ? `${placedAssets.length} non-light scene assets are available for placement and cost analysis.`
      : "No additional scene assets are present beyond cameras and lights.",
  ];

  const placementFacts = [
    ...cameras.map((camera) => `${camera.inferredShotId}: ${camera.name} at ${formatPosition(camera.position)} with ${camera.focalLength}mm lens intent.`),
    ...lights.map((light) => `${light.name} at ${formatPosition(light.position)} set to ${light.colorTemp}K with ${light.coneAngle}° spread.`),
    ...placedAssets.map((asset) => `${asset.name} (${asset.type}) placed at ${formatPosition(asset.position)}.`),
  ];

  const unresolvedFacts: string[] = [];
  if (metadata.shootDate === undefined) {
    unresolvedFacts.push("Shoot date is not provided.");
  }
  if (metadata.locationName === undefined && metadata.locationAddress === undefined) {
    unresolvedFacts.push("Location name and address are not provided.");
  }
  if (metadata.generalCallTime === undefined) {
    unresolvedFacts.push("General call time is not provided.");
  }
  if (cameras.some((camera) => camera.shotNumber === null && camera.shotLabel.length === 0 && camera.shotType.length === 0)) {
    unresolvedFacts.push("One or more cameras are missing explicit shot number, type, and label metadata.");
  }
  if (!placedAssets.some((asset) => asset.type === "cast_mark" || asset.semanticHints.includes("character"))) {
    unresolvedFacts.push("No explicit cast marks or typed performer markers are present in the scene export.");
  }
  if (!placedAssets.some((asset) => asset.type === "props")) {
    unresolvedFacts.push("No typed props are annotated in the scene export.");
  }
  if (!placedAssets.some((asset) => asset.type === "crew")) {
    unresolvedFacts.push("No crew assignments are present in the scene export.");
  }

  return {
    sceneId: scene.id,
    sceneTitle: scene.title,
    savedAt: scene.savedAt,
    splatUrl: scene.splatUrl,
    splatOffset: scene.splatOffset,
    metadata: {
      ...metadata,
      contacts: metadata.contacts ?? [],
      notes: metadata.notes ?? [],
      safetyNotes: metadata.safetyNotes ?? [],
    },
    elementCounts: {
      total: scene.elements.length,
      cameras: cameras.length,
      lights: lights.length,
      gltf: scene.elements.filter((element) => element.type === "gltf").length,
      equipment: scene.elements.filter((element) => element.type === "equipment").length,
      props: scene.elements.filter((element) => element.type === "props").length,
      castMarks: scene.elements.filter((element) => element.type === "cast_mark").length,
      crew: scene.elements.filter((element) => element.type === "crew").length,
    },
    cameras,
    lights,
    placedAssets,
    sceneSummary,
    placementFacts,
    unresolvedFacts,
  };
}
