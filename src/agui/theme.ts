/**
 * Theme overrides for CopilotKit AG-UI to match the Shot Caller dark theme.
 *
 * CopilotKit supports CSS custom properties for theming; we inject a small
 * <style> block that aligns the popup with the editor's visual language.
 */

const STYLE_ID = "scout-agent-theme";

export function injectScoutAgentTheme(): void {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    /* ── CopilotKit theme overrides ─────────────────────────────────────────── */

    :root {
      --copilot-kit-primary-color: #fbbf24;
      --copilot-kit-contrast-color: #0d0221;
      --copilot-kit-background-color: #120828;
      --copilot-kit-secondary-color: #1a0d33;
      --copilot-kit-separator-color: #2d1a4a;
      --copilot-kit-muted-color: #6b5a8a;
      --copilot-kit-response-button-background-color: #1a0d33;
      --copilot-kit-response-button-color: #a090bc;
    }

    /* Popup container adjustments */
    .copilotKitPopup {
      z-index: 9999 !important;
    }

    /* Button styling */
    .copilotKitButton {
      background: linear-gradient(135deg, #fbbf24, #f59e0b) !important;
      box-shadow: 0 4px 16px rgba(251, 191, 36, 0.3) !important;
      border: none !important;
      width: 48px !important;
      height: 48px !important;
      bottom: 20px !important;
      right: 20px !important;
    }
    .copilotKitButton:hover {
      box-shadow: 0 6px 24px rgba(251, 191, 36, 0.45) !important;
      transform: scale(1.05);
    }

    /* Window styling */
    .copilotKitWindow {
      border: 1px solid #2d1a4a !important;
      border-radius: 12px !important;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6) !important;
      background: #120828 !important;
      bottom: 80px !important;
      right: 20px !important;
      width: 420px !important;
      max-height: 600px !important;
    }

    /* Header */
    .copilotKitHeader {
      background: #0d0221 !important;
      border-bottom: 1px solid #2d1a4a !important;
      color: #fbbf24 !important;
      font-weight: 700 !important;
      letter-spacing: 1px !important;
    }

    /* Messages */
    .copilotKitMessages {
      background: #120828 !important;
    }

    .copilotKitMessage {
      color: #e2e8f0 !important;
    }

    .copilotKitAssistantMessage {
      background: #1a0d33 !important;
      border: 1px solid #2d1a4a !important;
      border-radius: 8px !important;
      color: #c4b5d8 !important;
    }

    .copilotKitUserMessage {
      background: rgba(251, 191, 36, 0.12) !important;
      border: 1px solid rgba(251, 191, 36, 0.25) !important;
      border-radius: 8px !important;
      color: #fbbf24 !important;
    }

    /* Input area */
    .copilotKitInput {
      background: #0d0221 !important;
      border-top: 1px solid #2d1a4a !important;
    }

    .copilotKitInput textarea {
      background: #1a0d33 !important;
      border: 1px solid #2d1a4a !important;
      color: #e2e8f0 !important;
      border-radius: 8px !important;
    }

    .copilotKitInput textarea::placeholder {
      color: #3d2a5a !important;
    }

    .copilotKitInput textarea:focus {
      border-color: #fbbf24 !important;
      outline: none !important;
    }

    /* Send button */
    .copilotKitInput button[type="submit"],
    .copilotKitInput button {
      background: #fbbf24 !important;
      color: #0d0221 !important;
      border: none !important;
      border-radius: 6px !important;
    }

    /* Suggestions */
    .copilotKitSuggestion {
      background: #1a0d33 !important;
      border: 1px solid #2d1a4a !important;
      color: #a090bc !important;
      border-radius: 6px !important;
    }

    .copilotKitSuggestion:hover {
      background: #2a1a40 !important;
      border-color: #fbbf24 !important;
      color: #fbbf24 !important;
    }

    /* Markdown content in messages */
    .copilotKitAssistantMessage h1,
    .copilotKitAssistantMessage h2,
    .copilotKitAssistantMessage h3 {
      color: #fbbf24 !important;
    }

    .copilotKitAssistantMessage code {
      background: #0d0221 !important;
      color: #a78bfa !important;
      padding: 2px 6px !important;
      border-radius: 4px !important;
    }

    .copilotKitAssistantMessage a {
      color: #38bdf8 !important;
    }

    .copilotKitAssistantMessage strong {
      color: #e2e8f0 !important;
    }

    .copilotKitAssistantMessage ul,
    .copilotKitAssistantMessage ol {
      color: #c4b5d8 !important;
    }
  `;

  document.head.appendChild(style);
}
