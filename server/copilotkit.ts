/**
 * CopilotKit Runtime endpoint for the Scout Agent.
 *
 * Supports Google Gemini (via GoogleGenerativeAIAdapter) and
 * OpenRouter/OpenAI (via OpenAIAdapter).
 */

import {
  CopilotRuntime,
  OpenAIAdapter,
  GoogleGenerativeAIAdapter,
  copilotRuntimeNodeExpressEndpoint,
} from "@copilotkit/runtime";
import OpenAI from "openai";

import { serverConfig } from "./config.js";

/** Resolve provider prefix from the configured model string. */
function getProvider(): string {
  const [provider] = serverConfig.models.intake.split("/", 1);
  return provider;
}

/** Resolve the model name stripping the provider prefix. */
function resolveModelName(): string {
  const intakeModel = serverConfig.models.intake;
  const [provider] = intakeModel.split("/", 1);

  if (provider === "openrouter") {
    return intakeModel.replace(/^openrouter\//, "");
  }

  return intakeModel.includes("/") ? intakeModel.split("/").slice(1).join("/") : intakeModel;
}

/** Create the appropriate CopilotKit service adapter based on configured provider. */
function createServiceAdapter() {
  const provider = getProvider();
  const model = resolveModelName();

  if (provider === "google") {
    // gemini-2.5-flash: fast, reliable tool calling, good for demos
    const geminiModel = "gemini-2.5-flash";
    console.log(`[copilotkit] Using Google Gemini adapter, model=${geminiModel}`);
    return new GoogleGenerativeAIAdapter({
      model: geminiModel,
      apiVersion: "v1beta",
      apiKey: process.env.GOOGLE_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    });
  }

  // OpenRouter / OpenAI / Anthropic fallback
  let openai: OpenAI;
  if (provider === "openrouter") {
    openai = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY ?? "",
      baseURL: "https://openrouter.ai/api/v1",
    });
  } else if (provider === "anthropic") {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY ?? process.env.ANTHROPIC_API_KEY ?? "",
    });
  } else {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY ?? "",
    });
  }

  console.log(`[copilotkit] Using OpenAI adapter, provider=${provider}, model=${model}`);
  return new OpenAIAdapter({ openai, model });
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
  const serviceAdapter = createServiceAdapter();
  const runtime = new CopilotRuntime();

  return copilotRuntimeNodeExpressEndpoint({
    runtime,
    serviceAdapter,
    endpoint: "/api/copilotkit",
  });
}
