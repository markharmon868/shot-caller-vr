/**
 * mountScoutAgent — Mounts the CopilotKit Scout Agent React island into the
 * existing vanilla-DOM editor shell.
 *
 * This creates a small React root inside a container div, keeping the rest of
 * the application as-is.  The React tree is limited to the AG-UI chat panel.
 */

import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { ScoutAgentPanel, type ScoutAgentPanelProps } from "./ScoutAgentPanel.js";

let root: Root | null = null;

/**
 * Mount the Scout Agent AG-UI panel into the page.
 *
 * Call once after the editor shell is rendered.  Subsequent calls update props
 * without remounting.
 */
export function mountScoutAgent(props: ScoutAgentPanelProps = {}): void {
  let container = document.getElementById("scout-agent-root");

  if (!container) {
    container = document.createElement("div");
    container.id = "scout-agent-root";
    document.body.appendChild(container);
  }

  if (!root) {
    root = createRoot(container);
  }

  root.render(React.createElement(ScoutAgentPanel, props));
}

/** Update props on an already-mounted panel. */
export function updateScoutAgent(props: ScoutAgentPanelProps): void {
  if (!root) {
    mountScoutAgent(props);
    return;
  }
  root.render(React.createElement(ScoutAgentPanel, props));
}

/** Tear down the React tree and remove the container. */
export function unmountScoutAgent(): void {
  if (root) {
    root.unmount();
    root = null;
  }
  document.getElementById("scout-agent-root")?.remove();
}
