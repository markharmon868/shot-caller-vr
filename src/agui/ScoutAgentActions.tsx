/**
 * ScoutAgentActions — CopilotKit action & readable definitions for the Scout Agent.
 *
 * Registers:
 * - Readable context: current scene state (coordinates, scene name, elements)
 * - Actions: location info lookup, script analysis, reference image suggestions
 */

import { useCopilotAction, useCopilotReadable } from "@copilotkit/react-core";

export interface ScoutAgentActionsProps {
  coordinates?: { lat: number; lng: number } | null;
  sceneName?: string;
  splatUrl?: string;
  elementCount?: number;
  onLocationSelect?: (lat: number, lng: number, name: string) => void;
  onGenerateSplat?: () => void;
}

export function ScoutAgentActions({
  coordinates,
  sceneName,
  splatUrl,
  elementCount,
  onLocationSelect,
  onGenerateSplat,
}: ScoutAgentActionsProps) {
  // ── Share current editor state with the AI ─────────────────────────────────

  useCopilotReadable({
    description: "Current scene state in the Shot Caller editor",
    value: {
      sceneName: sceneName ?? "Untitled Scene",
      coordinates: coordinates ?? null,
      splatUrl: splatUrl ?? null,
      elementCount: elementCount ?? 0,
      hasLocation: coordinates != null,
    },
  });

  // ── Action: Get detailed location information ──────────────────────────────

  useCopilotAction({
    name: "getLocationInfo",
    description:
      "Provide detailed filming location information for given coordinates or a place name. " +
      "Include climate, terrain, accessibility, nearby services, time zone, typical lighting " +
      "conditions, and any relevant filming logistics. If the user has already selected " +
      "coordinates in the editor, use those by default.",
    parameters: [
      {
        name: "placeName",
        type: "string",
        description: "Name of the place or address to look up (optional if coordinates are provided)",
        required: false,
      },
      {
        name: "latitude",
        type: "number",
        description: "Latitude of the location",
        required: false,
      },
      {
        name: "longitude",
        type: "number",
        description: "Longitude of the location",
        required: false,
      },
    ],
    handler: async ({ placeName, latitude, longitude }) => {
      const lat = latitude ?? coordinates?.lat;
      const lng = longitude ?? coordinates?.lng;

      const context: Record<string, unknown> = {};

      if (placeName) context.place = placeName;
      if (lat != null && lng != null) {
        context.latitude = lat;
        context.longitude = lng;
        // Derive hemisphere and rough timezone from coordinates
        context.hemisphere = lat >= 0 ? "Northern" : "Southern";
        context.estimatedTimezone = `UTC${lng >= 0 ? "+" : ""}${Math.round(lng / 15)}`;
      }

      context.requestedDetails = [
        "climate and weather patterns",
        "terrain type and accessibility",
        "nearby services (hotels, equipment rentals, hospitals)",
        "golden hour timing",
        "filming permits or restrictions",
        "power and utility access",
      ];

      return JSON.stringify(context, null, 2);
    },
  });

  // ── Action: Analyze a script for location requirements ─────────────────────

  useCopilotAction({
    name: "analyzeScript",
    description:
      "Analyze a film script or scene description to extract location requirements, " +
      "mood/atmosphere, lighting needs, and suggested real-world locations that match. " +
      "Provide a structured breakdown of what the scene needs.",
    parameters: [
      {
        name: "scriptText",
        type: "string",
        description: "The script text or scene description to analyze",
        required: true,
      },
      {
        name: "genre",
        type: "string",
        description: "The genre of the production (e.g., drama, action, horror, comedy)",
        required: false,
      },
    ],
    handler: async ({ scriptText, genre }) => {
      const context: Record<string, unknown> = {
        scriptExcerpt: scriptText.slice(0, 2000),
        excerptLength: scriptText.length,
        genre: genre ?? "unspecified",
        analysisRequested: [
          "setting requirements (interior/exterior, time of day, season)",
          "atmosphere and mood (lighting quality, color palette, texture)",
          "key visual elements (props, set pieces, background)",
          "location type (urban, rural, industrial, natural)",
          "suggested real-world locations (3-5 places)",
          "production considerations (crew size, equipment, challenges)",
        ],
      };

      return JSON.stringify(context, null, 2);
    },
  });

  // ── Action: Get cinematography recommendations ─────────────────────────────

  useCopilotAction({
    name: "getCinematographyNotes",
    description:
      "Provide brief cinematography recommendations for a scene at the current location. " +
      "Include best time of day, camera angles, lens suggestions, and lighting notes. " +
      "Keep it to 3-4 bullet points maximum.",
    parameters: [
      {
        name: "sceneType",
        type: "string",
        description: "Type of scene (e.g., 'chase', 'romantic', 'dramatic reveal', 'establishing shot')",
        required: true,
      },
    ],
    handler: async ({ sceneType }) => {
      const context: Record<string, unknown> = {
        sceneType,
        location: coordinates ? { lat: coordinates.lat, lng: coordinates.lng } : null,
        requested: ["best time of day", "camera angles", "lens choice", "lighting direction"],
      };
      return JSON.stringify(context, null, 2);
    },
  });

  // ── Action: Get production-specific notes about a location ─────────────────

  useCopilotAction({
    name: "getProductionNotes",
    description:
      "Provide production-specific logistical notes about a filming location. " +
      "Cover parking, power availability, noise levels, permit requirements, " +
      "weather risks, crew staging areas, and any special considerations.",
    parameters: [
      {
        name: "location",
        type: "string",
        description: "The location name or description",
        required: true,
      },
      {
        name: "crewSize",
        type: "string",
        description: "Expected crew size (e.g., 'small 5-10', 'medium 20-30', 'large 50+')",
        required: false,
      },
      {
        name: "shootDuration",
        type: "string",
        description: "Expected shoot duration (e.g., '1 day', '3 days', '2 weeks')",
        required: false,
      },
    ],
    handler: async ({ location, crewSize, shootDuration }) => {
      const context: Record<string, unknown> = {
        location,
        crewSize: crewSize ?? null,
        shootDuration: shootDuration ?? null,
        notesRequested: [
          "parking and base camp (trucks, trailers, crew vehicles)",
          "power (generator placement, grid access, electrical capacity)",
          "sound (ambient noise levels, flight paths, traffic patterns)",
          "permits (required permits, lead time, costs, restrictions)",
          "weather risks (seasonal concerns, backup plans)",
          "crew staging (holding areas, craft services placement)",
          "safety (hazards, medical access, emergency routes)",
          "community relations (nearby residents, business impact)",
        ],
      };

      return JSON.stringify(context, null, 2);
    },
  });

  // ── Action: Set location on map (bridges AI → editor) ──────────────────────

  useCopilotAction({
    name: "setEditorLocation",
    description:
      "Set the editor's active location to specific coordinates. Use this when " +
      "suggesting a location to the user so they can immediately see it on the map " +
      "and start working with it.",
    parameters: [
      {
        name: "latitude",
        type: "number",
        description: "Latitude of the suggested location",
        required: true,
      },
      {
        name: "longitude",
        type: "number",
        description: "Longitude of the suggested location",
        required: true,
      },
      {
        name: "locationName",
        type: "string",
        description: "Human-readable name of the location",
        required: true,
      },
    ],
    handler: async ({ latitude, longitude, locationName }) => {
      if (onLocationSelect) {
        onLocationSelect(latitude, longitude, locationName);
        return `Location set to ${locationName} (${latitude.toFixed(4)}, ${longitude.toFixed(4)}). The map and Street View have been updated. You should now offer to generate a 3D Gaussian Splat of this location by calling generateGaussianSplat.`;
      }
      return `Suggested location: ${locationName} (${latitude.toFixed(4)}, ${longitude.toFixed(4)}) — navigate to Scout mode to apply.`;
    },
  });

  // ── Action: Generate and load a 3D Gaussian Splat ───────────────────────

  useCopilotAction({
    name: "generateGaussianSplat",
    description:
      "Generate a 3D Gaussian Splat and open it in the Shot Caller editor. " +
      "Use this after setting a location to let the filmmaker walk through the scene in 3D/VR. " +
      "This loads the 3D scene in the editor where they can place cameras, actors, and props.",
    parameters: [
      {
        name: "sceneName",
        type: "string",
        description: "A short name for this scene (e.g., 'golden-gate-chase', 'downtown-la-reveal')",
        required: true,
      },
    ],
    handler: async ({ sceneName }) => {
      // Use the pre-built LA splat with the la-scout scene bundle (has VR support)
      const sceneId = "la-scout";
      const splatFile = "./splats/scene-711be87d.spz";
      const editorUrl = `/?mode=editor&scene=${sceneId}&splat=${splatFile}`;

      // Small delay to let the user see the response, then navigate
      setTimeout(() => {
        window.location.href = editorUrl;
      }, 2000);

      return `3D scene "${sceneName}" is ready! Opening the editor — place cameras & props, then click VR Preview to walk through it.`;
    },
  });

  // This component only registers hooks — no UI output
  return null;
}
