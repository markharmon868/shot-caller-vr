import {
  IntakeAssetStore,
  IntakeSessionStore,
  createLibSqlClient,
  createMastraStore,
  ensureIntakeTables,
} from "../intake/storage.js";

async function main(): Promise<void> {
  const client = await createLibSqlClient();
  await ensureIntakeTables(client);

  const sessionStore = new IntakeSessionStore(client);
  const assetStore = new IntakeAssetStore(client);
  const storage = createMastraStore();
  const memoryStore = await storage.getStore("memory");

  const sessions = await sessionStore.listSessions();

  const rows = await Promise.all(
    sessions.map(async (session) => {
      const assets = await assetStore.listAssetsForThread(session.threadId);
      const thread = memoryStore
        ? await memoryStore.getThreadById({ threadId: session.threadId })
        : null;

      return {
        threadId: session.threadId,
        resourceId: session.resourceId,
        status: session.status,
        activeRunId: session.activeRunId,
        assetCount: assets.length,
        latestQuestionCount: session.latestQuestions?.length ?? 0,
        hasPromptBundle: Boolean(session.result),
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        mastraThreadTitle: thread?.title ?? null,
      };
    }),
  );

  await client.close();

  console.log(JSON.stringify(rows, null, 2));
}

void main().catch((error) => {
  console.error("[list-intake-threads] failed", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
