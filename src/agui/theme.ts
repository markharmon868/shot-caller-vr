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

    /* ── Hide CopilotKit branding & debug UI ──────────────────────────────── */

    /* Debug menu (Help / Debug buttons) */
    .copilotKitDebugMenuTriggerButton,
    .copilotKitDebugMenu,
    button[aria-label="Open Help"],
    button[aria-label="Open Debug Menu"] {
      display: none !important;
    }

    /* "Powered by CopilotKit" footer text */
    .poweredBy {
      display: none !important;
    }

    /* Reaction buttons (regenerate, copy, like, dislike) */
    .copilotKitResponseActions {
      opacity: 0.4;
      transition: opacity 0.2s;
    }
    .copilotKitResponseActions:hover {
      opacity: 1;
    }

    /* ── Popup container ──────────────────────────────────────────────────── */

    .copilotKitPopup {
      z-index: 9999 !important;
    }

    /* Toggle button */
    .copilotKitButton {
      background: linear-gradient(135deg, #fbbf24, #f59e0b) !important;
      box-shadow: 0 4px 16px rgba(251, 191, 36, 0.3) !important;
      border: none !important;
      width: 48px !important;
      height: 48px !important;
      bottom: 20px !important;
      right: 20px !important;
      transition: transform 0.2s, box-shadow 0.2s !important;
    }
    .copilotKitButton:hover {
      box-shadow: 0 6px 24px rgba(251, 191, 36, 0.45) !important;
      transform: scale(1.08);
    }

    /* ── Chat window ──────────────────────────────────────────────────────── */

    .copilotKitWindow {
      border: 1px solid #2d1a4a !important;
      border-radius: 14px !important;
      box-shadow: 0 24px 64px rgba(0, 0, 0, 0.7) !important;
      background: #120828 !important;
      bottom: 80px !important;
      right: 20px !important;
      width: 380px !important;
      max-height: 560px !important;
      overflow: hidden !important;
    }

    /* Header */
    .copilotKitHeader {
      background: linear-gradient(135deg, #0d0221, #1a0d33) !important;
      border-bottom: 1px solid #2d1a4a !important;
      color: #fbbf24 !important;
      font-weight: 700 !important;
      letter-spacing: 0.5px !important;
      padding: 12px 16px !important;
      font-size: 15px !important;
    }

    /* ── Messages ─────────────────────────────────────────────────────────── */

    .copilotKitMessages {
      background: #120828 !important;
      padding: 12px !important;
    }

    .copilotKitMessage {
      color: #e2e8f0 !important;
      font-size: 13.5px !important;
      line-height: 1.5 !important;
    }

    .copilotKitAssistantMessage {
      background: #1a0d33 !important;
      border: 1px solid #2d1a4a !important;
      border-radius: 10px !important;
      color: #d4c8e8 !important;
      padding: 12px 14px !important;
      margin-bottom: 8px !important;
    }

    .copilotKitUserMessage {
      background: rgba(251, 191, 36, 0.1) !important;
      border: 1px solid rgba(251, 191, 36, 0.2) !important;
      border-radius: 10px !important;
      color: #fbbf24 !important;
      padding: 10px 14px !important;
      margin-bottom: 8px !important;
      font-weight: 500 !important;
    }

    /* ── Input area ───────────────────────────────────────────────────────── */

    .copilotKitInput {
      background: #0d0221 !important;
      border-top: 1px solid #2d1a4a !important;
      padding: 10px 12px !important;
    }

    .copilotKitInput textarea {
      background: #1a0d33 !important;
      border: 1px solid #2d1a4a !important;
      color: #e2e8f0 !important;
      border-radius: 10px !important;
      font-size: 13.5px !important;
      padding: 10px 12px !important;
      transition: border-color 0.2s !important;
    }

    .copilotKitInput textarea::placeholder {
      color: #4a3570 !important;
    }

    .copilotKitInput textarea:focus {
      border-color: #fbbf24 !important;
      outline: none !important;
      box-shadow: 0 0 0 2px rgba(251, 191, 36, 0.15) !important;
    }

    /* Send button */
    .copilotKitInput button[type="submit"],
    .copilotKitInput button {
      background: #fbbf24 !important;
      color: #0d0221 !important;
      border: none !important;
      border-radius: 8px !important;
      font-weight: 600 !important;
      transition: background 0.2s, transform 0.1s !important;
    }
    .copilotKitInput button:hover {
      background: #f59e0b !important;
      transform: scale(1.05) !important;
    }

    /* ── Markdown in messages ─────────────────────────────────────────────── */

    .copilotKitAssistantMessage strong {
      color: #fbbf24 !important;
      font-weight: 600 !important;
    }

    .copilotKitAssistantMessage h1,
    .copilotKitAssistantMessage h2,
    .copilotKitAssistantMessage h3 {
      color: #fbbf24 !important;
      margin: 8px 0 4px !important;
      font-size: 14px !important;
    }

    .copilotKitAssistantMessage ul,
    .copilotKitAssistantMessage ol {
      color: #d4c8e8 !important;
      padding-left: 18px !important;
      margin: 4px 0 !important;
    }

    .copilotKitAssistantMessage li {
      margin-bottom: 4px !important;
    }

    .copilotKitAssistantMessage code {
      background: #0d0221 !important;
      color: #a78bfa !important;
      padding: 2px 6px !important;
      border-radius: 4px !important;
      font-size: 12px !important;
    }

    .copilotKitAssistantMessage a {
      color: #38bdf8 !important;
      text-decoration: none !important;
    }

    /* ── In-progress indicator ────────────────────────────────────────────── */

    .copilotKitThinking,
    .copilotKitLoading {
      color: #fbbf24 !important;
    }
  `;

  document.head.appendChild(style);
}
