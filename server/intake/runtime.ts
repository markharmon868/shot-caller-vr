import { Memory } from "@mastra/memory";

import { serverConfig } from "../config.js";
import {
  IntakeAssetStore,
  IntakeSessionStore,
  createLibSqlClient,
  createMastraStore,
  ensureIntakeTables,
} from "./storage.js";
import { createIntakeRuntime, type IntakeRuntime } from "./workflow.js";

export interface AppRuntime extends IntakeRuntime {
  sessionStore: IntakeSessionStore;
  assetStore: IntakeAssetStore;
}

let runtimePromise: Promise<AppRuntime> | undefined;

export async function getAppRuntime(): Promise<AppRuntime> {
  if (!runtimePromise) {
    runtimePromise = initializeRuntime();
  }
  return runtimePromise;
}

async function initializeRuntime(): Promise<AppRuntime> {
  const client = await createLibSqlClient();
  await ensureIntakeTables(client);

  const storage = createMastraStore();
  await storage.getStore("memory");
  await storage.getStore("workflows");

  const memory = new Memory({
    storage,
    options: {
      lastMessages: 40,
      semanticRecall: false,
    },
  });

  const sessionStore = new IntakeSessionStore(client);
  const assetStore = new IntakeAssetStore(client);

  const intakeRuntime = await createIntakeRuntime({
    storage,
    memory,
    assetStore,
    models: serverConfig.models,
  });

  return {
    ...intakeRuntime,
    sessionStore,
    assetStore,
  };
}
