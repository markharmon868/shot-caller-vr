/**
 * CopilotKit Runtime endpoint for the Scout Agent.
 *
 * Uses the OpenAI-compatible adapter pointed at OpenRouter (or direct OpenAI)
 * so the same OPENROUTER_API_KEY / OPENAI_API_KEY used elsewhere in the
 * project powers the AG-UI chat.
 */

import {
  CopilotRuntime,
  OpenAIAdapter,
  copilotRuntimeNodeExpressEndpoint,
} from "@copilotkit/runtime";
import OpenAI from "openai";

import { serverConfig } from "./config.js";

/** Resolve the OpenAI-compatible client for the configured model provider. */
function createOpenAIClient(): OpenAI {
  const intakeModel = serverConfig.models.intake; // e.g. "openrouter/openai/gpt-4.1-mini"
  const [provider] = intakeModel.split("/", 1);

  if (provider === "openrouter") {
    return new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY ?? "",
      baseURL: "https://openrouter.ai/api/v1",
    });
  }

  if (provider === "anthropic") {
    // Anthropic doesn't expose an OpenAI-compatible endpoint;
    // fall back to OpenAI if the key is set, otherwise use the anthropic key.
    return new OpenAI({
      apiKey: process.env.OPENAI_API_KEY ?? process.env.ANTHROPIC_API_KEY ?? "",
    });
  }

  // Default: direct OpenAI
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY ?? "",
  });
}

/** Resolve the model name the adapter should request. */
function resolveModelName(): string {
  const intakeModel = serverConfig.models.intake;
  const [provider] = intakeModel.split("/", 1);

  if (provider === "openrouter") {
    // Strip the "openrouter/" prefix — OpenRouter expects "openai/gpt-4.1-mini"
    return intakeModel.replace(/^openrouter\//, "");
  }

  // For direct providers, strip the provider prefix
  return intakeModel.includes("/") ? intakeModel.split("/").slice(1).join("/") : intakeModel;
}

/**
 * Returns Express middleware that handles `/api/copilotkit` requests.
 *
 * Usage in server/index.ts:
 * ```ts
 * import { createCopilotKitEndpoint } from "./copilotkit.js";
 * app.use("/api/copilotkit", createCopilotKitEndpoint());
 * ```
 */
export function createCopilotKitEndpoint() {
  const openai = createOpenAIClient();
  const model = resolveModelName();

  const serviceAdapter = new OpenAIAdapter({ openai, model });
  const runtime = new CopilotRuntime();

  return copilotRuntimeNodeExpressEndpoint({
    runtime,
    serviceAdapter,
    endpoint: "/api/copilotkit",
  });
}
