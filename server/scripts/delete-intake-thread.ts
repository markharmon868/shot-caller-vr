import fs from "node:fs/promises";
import path from "node:path";

import { serverConfig } from "../config.js";
import {
  IntakeAssetStore,
  IntakeSessionStore,
  createLibSqlClient,
  createMastraStore,
  ensureIntakeTables,
} from "../intake/storage.js";

type ParsedArgs = {
  threadId: string;
};

function parseArgs(argv: string[]): ParsedArgs {
  const [threadId] = argv;
  if (!threadId) {
    throw new Error("Usage: npm run intake:delete-thread -- <threadId>");
  }

  return { threadId };
}

async function main(): Promise<void> {
  const { threadId } = parseArgs(process.argv.slice(2));

  const client = await createLibSqlClient();
  await ensureIntakeTables(client);

  const storage = createMastraStore();
  const memoryStore = await storage.getStore("memory");
  const workflowStore = await storage.getStore("workflows");

  if (!memoryStore) {
    throw new Error("Mastra memory store is unavailable.");
  }
  if (!workflowStore) {
    throw new Error("Mastra workflows store is unavailable.");
  }

  const sessionStore = new IntakeSessionStore(client);
  const assetStore = new IntakeAssetStore(client);

  const session = await sessionStore.getSession(threadId);
  const assets = await assetStore.listAssetsForThread(threadId);

  if (session?.activeRunId) {
    await workflowStore.deleteWorkflowRunById({
      workflowName: "intake-workflow",
      runId: session.activeRunId,
    });
  }

  await memoryStore.deleteThread({ threadId });
  await sessionStore.deleteSession(threadId);
  await assetStore.deleteAssetsForThread(threadId);
  await fs.rm(path.join(serverConfig.assetDir, threadId), { recursive: true, force: true });

  await client.close();

  console.log(
    JSON.stringify(
      {
        deleted: true,
        threadId,
        deletedRunId: session?.activeRunId ?? null,
        deletedAssetCount: assets.length,
        deletedAssetDirectory: path.join(serverConfig.assetDir, threadId),
        deletedSession: Boolean(session),
      },
      null,
      2,
    ),
  );
}

void main().catch((error) => {
  console.error("[delete-intake-thread] failed", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
