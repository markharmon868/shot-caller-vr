/**
 * ScoutAgentPanel — CopilotKit AG-UI chat sidebar for the Scout Agent.
 *
 * Provides an AI-powered assistant inside the editor that helps with:
 * - Location information (climate, accessibility, logistics)
 * - Script breakdown & location requirement extraction
 * - Reference image suggestions for visualization
 * - Production notes (parking, power, noise, permits)
 * - Generating Gaussian Splats from scouted locations
 */

import { useCallback, useState } from "react";
import { CopilotKit } from "@copilotkit/react-core";
import { CopilotPopup } from "@copilotkit/react-ui";
import { ScoutAgentActions } from "./ScoutAgentActions.js";

import "@copilotkit/react-ui/styles.css";

export interface ScoutAgentPanelProps {
  /** Current scene coordinates (lat/lng) if available */
  coordinates?: { lat: number; lng: number } | null;
  /** Current scene name */
  sceneName?: string;
  /** Splat URL currently loaded */
  splatUrl?: string;
  /** Number of production elements in the scene */
  elementCount?: number;
  /** Callback to set location from agent suggestion */
  onLocationSelect?: (lat: number, lng: number, name: string) => void;
  /** Callback to trigger Gaussian Splat generation */
  onGenerateSplat?: () => void;
}

export function ScoutAgentPanel({
  coordinates,
  sceneName,
  splatUrl,
  elementCount,
  onLocationSelect,
  onGenerateSplat,
}: ScoutAgentPanelProps) {
  const [, setIsOpen] = useState(true);

  const handleSetOpen = useCallback((open: boolean) => {
    setIsOpen(open);
  }, []);

  return (
    <CopilotKit runtimeUrl="/api/copilotkit" enableInspector={false}>
      <ScoutAgentActions
        coordinates={coordinates}
        sceneName={sceneName}
        splatUrl={splatUrl}
        elementCount={elementCount}
        onLocationSelect={onLocationSelect}
        onGenerateSplat={onGenerateSplat}
      />
      <CopilotPopup
        defaultOpen={true}
        instructions={[
          "You are Shot Caller's Scout Agent — a fast, decisive location scout for film productions.",
          "",
          "MANDATORY BEHAVIOR — follow these rules exactly:",
          "",
          "1. NEVER ask clarifying questions. ALWAYS pick a specific location immediately and call setEditorLocation with exact lat/lng coordinates. Be decisive.",
          "2. Keep ALL responses under 4 bullet points. Maximum 2 sentences per bullet. No paragraphs.",
          "3. On EVERY user message, call at least one tool. Never respond with just text.",
          "4. After calling setEditorLocation, IMMEDIATELY ask: 'Want me to generate a 3D walkthrough of this location?'",
          "5. If the user says yes/generate/do it, call generateGaussianSplat right away.",
          "6. Tool usage pattern: getLocationInfo for details, analyzeScript for scripts, setEditorLocation to move the map, generateGaussianSplat to create the 3D scene.",
          "7. Be opinionated. Pick ONE best spot, not a list. Include exact coordinates.",
          "",
          "You know every major filming location in SF, LA, NYC, London, and Tokyo.",
        ].join("\n")}
        labels={{
          title: "Scout Agent",
          initial:
            "I'm your Scout Agent. Tell me about your scene and I'll find the perfect spot.\n\n" +
            "Try: **\"I need a dramatic bridge shot for a chase scene\"**",
          placeholder: "Describe your scene or paste a script excerpt…",
        }}
        onSetOpen={handleSetOpen}
        clickOutsideToClose={false}
      />
    </CopilotKit>
  );
}
