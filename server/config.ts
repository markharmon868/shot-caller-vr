import "dotenv/config";
import path from "path";

const DATA_DIR = path.resolve(process.cwd(), ".data");

export const serverConfig = {
  port: Number.parseInt(process.env.SHOT_CALLER_SERVER_PORT ?? "8787", 10),
  dataDir: DATA_DIR,
  assetDir: path.join(DATA_DIR, "intake-assets"),
  mastraDbUrl: `file:${path.join(DATA_DIR, "mastra", "mastra.db")}`,
  mastraStoreId: "shot-caller-mastra",
  models: {
    intake: process.env.SHOT_CALLER_INTAKE_MODEL ?? "openrouter/openai/gpt-4.1-mini",
    imagePrompt: process.env.SHOT_CALLER_IMAGE_PROMPT_MODEL ?? "openrouter/openai/gpt-4.1-mini",
    meshyPrompt: process.env.SHOT_CALLER_MESHY_PROMPT_MODEL ?? "openrouter/openai/gpt-4.1-mini",
    callSheet: process.env.SHOT_CALLER_CALL_SHEET_MODEL
      ?? process.env.SHOT_CALLER_INTAKE_MODEL
      ?? "openrouter/openai/gpt-4.1-mini",
  },
  upload: {
    maxFileSizeBytes: 10 * 1024 * 1024,
  },
} as const;

const PROVIDER_ENV_KEYS = {
  openai: "OPENAI_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  google: "GOOGLE_GENERATIVE_AI_API_KEY",
} as const;

function requiredEnvKeyForModel(modelId: string): string | null {
  const [provider] = modelId.split("/", 1);
  if (!provider) {
    return null;
  }
  return PROVIDER_ENV_KEYS[provider as keyof typeof PROVIDER_ENV_KEYS] ?? null;
}

export function validateServerConfig(): void {
  const missing = new Map<string, string[]>();
  const configuredModels = Object.entries(serverConfig.models);

  for (const [slot, modelId] of configuredModels) {
    const envKey = requiredEnvKeyForModel(modelId);
    if (!envKey) {
      continue;
    }
    if (process.env[envKey]?.trim()) {
      continue;
    }

    const slots = missing.get(envKey) ?? [];
    slots.push(`${slot}=${modelId}`);
    missing.set(envKey, slots);
  }

  if (missing.size === 0) {
    return;
  }

  const details = Array.from(missing.entries())
    .map(([envKey, slots]) => `${envKey} required for ${slots.join(", ")}`)
    .join("; ");

  throw new Error(
    `Invalid intake server configuration: ${details}. Copy .env.example to .env, set the missing provider keys, then restart the server.`,
  );
}
