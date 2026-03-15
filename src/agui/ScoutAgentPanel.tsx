/**
 * ScoutAgentPanel — CopilotKit AG-UI chat sidebar for the Scout Agent.
 *
 * Provides an AI-powered assistant inside the editor that helps with:
 * - Location information (climate, accessibility, logistics)
 * - Script breakdown & location requirement extraction
 * - Reference image suggestions for visualization
 * - Production notes (parking, power, noise, permits)
 */

import React, { useCallback, useState } from "react";
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
}

export function ScoutAgentPanel({
  coordinates,
  sceneName,
  splatUrl,
  elementCount,
  onLocationSelect,
}: ScoutAgentPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSetOpen = useCallback((open: boolean) => {
    setIsOpen(open);
  }, []);

  return (
    <CopilotKit runtimeUrl="/api/copilotkit">
      <ScoutAgentActions
        coordinates={coordinates}
        sceneName={sceneName}
        splatUrl={splatUrl}
        elementCount={elementCount}
        onLocationSelect={onLocationSelect}
      />
      <CopilotPopup
        labels={{
          title: "Scout Agent",
          initial:
            "Hi! I'm your Scout Agent. I can help you with:\n\n" +
            "📍 **Location Info** — Get details about filming locations\n" +
            "📝 **Script Analysis** — Extract location needs from scripts\n" +
            "🖼️ **Reference Images** — Suggest visual references\n" +
            "🎬 **Production Notes** — Logistics, permits, and more\n\n" +
            "How can I help with your production?",
          placeholder: "Ask about locations, scripts, or production needs…",
        }}
        onSetOpen={handleSetOpen}
        clickOutsideToClose={false}
      />
    </CopilotKit>
  );
}
