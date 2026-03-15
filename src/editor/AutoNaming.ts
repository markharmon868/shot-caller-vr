/**
 * AutoNaming — Tesler principle: Smart defaults eliminate decisions
 * Automatically generate meaningful names for elements
 */

import type { ProductionElement } from "./elements/ProductionElement.js";

interface NamingContext {
  existingElements: ProductionElement[];
  type: string;
  position?: { x: number; y: number; z: number };
}

/**
 * Generate automatic name for element based on type and context
 */
export function generateElementName(context: NamingContext): string {
  const { type, existingElements } = context;

  // Count existing elements of same type
  const sameTypeCount = existingElements.filter(
    (el) => el.type === type,
  ).length;

  const nextNumber = sameTypeCount + 1;

  switch (type) {
    case "camera":
      // Use letters for cameras (A, B, C, etc.)
      return `Camera ${String.fromCharCode(64 + nextNumber)}`;

    case "light":
      // Number lights sequentially
      return `Light ${nextNumber}`;

    case "cast_mark":
    case "cast":
      // Use position-based names for actors
      if (nextNumber === 1) return "Actor 1 (Lead)";
      if (nextNumber === 2) return "Actor 2 (Supporting)";
      return `Actor ${nextNumber}`;

    case "crew":
      // Use common crew positions
      const crewPositions = [
        "Director",
        "DP",
        "1st AC",
        "Gaffer",
        "Key Grip",
        "Sound",
        "Script Supervisor",
        "Boom Op",
      ];
      if (nextNumber <= crewPositions.length) {
        return crewPositions[nextNumber - 1];
      }
      return `Crew ${nextNumber}`;

    case "equipment":
      // Name by common equipment types
      const equipmentTypes = [
        "C-Stand",
        "Sandbag",
        "Apple Box",
        "Dolly",
        "Crane",
        "Monitor",
        "Video Village",
      ];
      if (nextNumber <= equipmentTypes.length) {
        return equipmentTypes[nextNumber - 1];
      }
      return `Equipment ${nextNumber}`;

    case "prop":
    case "props":
      return `Prop ${nextNumber}`;

    default:
      return `Element ${nextNumber}`;
  }
}

/**
 * Generate shot label for camera based on shot type and number
 */
export function generateShotLabel(
  shotNumber: number,
  shotType?: string,
  setupGroup?: string,
): string {
  const parts: string[] = [];

  // Shot number
  parts.push(`Shot ${String(shotNumber).padStart(2, "0")}`);

  // Shot type abbreviation
  if (shotType) {
    const typeAbbrev: Record<string, string> = {
      Wide: "WS",
      Medium: "MS",
      CU: "CU",
      "Close Up": "CU",
      OTS: "OTS",
      Insert: "INS",
      POV: "POV",
    };
    const abbrev = typeAbbrev[shotType] || shotType;
    parts.push(abbrev);
  }

  // Setup group
  if (setupGroup) {
    parts.push(`(${setupGroup})`);
  }

  return parts.join(" ");
}

/**
 * Get suggested camera name based on position
 */
export function suggestCameraName(
  position: { x: number; y: number; z: number },
  existingCameras: ProductionElement[],
): string {
  // Simple heuristic: cameras further back are "wide", closer are "close"
  const distance = Math.sqrt(position.x ** 2 + position.z ** 2);

  let baseName = "Camera";

  if (distance > 5) {
    baseName = "Wide";
  } else if (distance > 2) {
    baseName = "Medium";
  } else {
    baseName = "Close";
  }

  // Add letter suffix
  const sameTypeCount = existingCameras.length;
  const letter = String.fromCharCode(65 + sameTypeCount);

  return `${baseName} ${letter}`;
}

/**
 * Sanitize user-provided name
 */
export function sanitizeName(name: string): string {
  // Remove leading/trailing whitespace
  let sanitized = name.trim();

  // Replace multiple spaces with single space
  sanitized = sanitized.replace(/\s+/g, " ");

  // Limit length
  if (sanitized.length > 50) {
    sanitized = sanitized.substring(0, 50).trim();
  }

  // If empty after sanitization, return default
  if (!sanitized) {
    return "Untitled";
  }

  return sanitized;
}
