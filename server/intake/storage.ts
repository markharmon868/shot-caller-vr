import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { createClient, type Client, type InStatement } from "@libsql/client";
import { LibSQLStore } from "@mastra/libsql";
import { imageSize } from "image-size";

import type { PromptBundle, UploadRef } from "../../shared/contracts/intake.js";
import { serverConfig } from "../config.js";

type NullableString = string | null;

export interface StoredIntakeSession {
  threadId: string;
  resourceId: string;
  activeRunId: string;
  status: "collecting" | "needs_user_input" | "prompt_bundle_ready" | "failed";
  latestQuestions: string[] | null;
  result: PromptBundle | null;
  createdAt: string;
  updatedAt: string;
}

export interface StoredAsset {
  assetId: string;
  threadId: string;
  storageKey: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  originalFilename: string | null;
  sha256: string;
  createdAt: string;
}

function sql(strings: TemplateStringsArray, ...values: Array<string | number | null>): InStatement {
  let built = strings[0] ?? "";
  const args: Array<string | number | null> = [];
  for (let index = 0; index < values.length; index += 1) {
    built += `?${index + 1}${strings[index + 1] ?? ""}`;
    args.push(values[index]);
  }
  return { sql: built, args };
}

function asString(value: unknown): string {
  if (typeof value !== "string") {
    throw new Error(`Expected string value, received ${typeof value}`);
  }
  return value;
}

function asNullableString(value: unknown): NullableString {
  return typeof value === "string" ? value : null;
}

function asNullableNumber(value: unknown): number | null {
  return typeof value === "number" ? value : null;
}

function serializeJson(value: unknown): string | null {
  return value == null ? null : JSON.stringify(value);
}

function deserializeJson<T>(value: unknown): T | null {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }
  return JSON.parse(value) as T;
}

function toUploadRef(asset: StoredAsset): UploadRef {
  return {
    assetId: asset.assetId,
    url: `/api/intake/assets/${asset.assetId}`,
    mimeType: asset.mimeType,
    width: asset.width ?? undefined,
    height: asset.height ?? undefined,
    originalFilename: asset.originalFilename ?? undefined,
  };
}

function normalizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").slice(0, 80);
}

export async function createLibSqlClient(): Promise<Client> {
  await fs.mkdir(path.dirname(serverConfig.mastraDbUrl.replace(/^file:/, "")), { recursive: true });
  return createClient({ url: serverConfig.mastraDbUrl });
}

export function createMastraStore(): LibSQLStore {
  return new LibSQLStore({
    id: serverConfig.mastraStoreId,
    url: serverConfig.mastraDbUrl,
  });
}

export async function ensureIntakeTables(client: Client): Promise<void> {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS intake_sessions (
      thread_id TEXT PRIMARY KEY,
      resource_id TEXT NOT NULL,
      active_run_id TEXT NOT NULL,
      status TEXT NOT NULL,
      latest_questions_json TEXT,
      latest_result_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
  await client.execute(`
    CREATE TABLE IF NOT EXISTS intake_assets (
      asset_id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL,
      storage_key TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      width INTEGER,
      height INTEGER,
      original_filename TEXT,
      sha256 TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);
  await client.execute(`
    CREATE INDEX IF NOT EXISTS intake_sessions_resource_idx
    ON intake_sessions (resource_id)
  `);
  await client.execute(`
    CREATE INDEX IF NOT EXISTS intake_assets_thread_idx
    ON intake_assets (thread_id)
  `);
}

export class IntakeSessionStore {
  constructor(private readonly client: Client) {}

  async createSession(input: {
    threadId: string;
    resourceId: string;
    activeRunId: string;
  }): Promise<StoredIntakeSession> {
    const now = new Date().toISOString();
    await this.client.execute(
      sql`
        INSERT INTO intake_sessions (
          thread_id,
          resource_id,
          active_run_id,
          status,
          latest_questions_json,
          latest_result_json,
          created_at,
          updated_at
        )
        VALUES (
          ${input.threadId},
          ${input.resourceId},
          ${input.activeRunId},
          ${"collecting"},
          ${null},
          ${null},
          ${now},
          ${now}
        )
      `,
    );

    return {
      threadId: input.threadId,
      resourceId: input.resourceId,
      activeRunId: input.activeRunId,
      status: "collecting",
      latestQuestions: null,
      result: null,
      createdAt: now,
      updatedAt: now,
    };
  }

  async getSession(threadId: string): Promise<StoredIntakeSession | null> {
    const result = await this.client.execute(
      sql`
        SELECT
          thread_id,
          resource_id,
          active_run_id,
          status,
          latest_questions_json,
          latest_result_json,
          created_at,
          updated_at
        FROM intake_sessions
        WHERE thread_id = ${threadId}
      `,
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return {
      threadId: asString(row.thread_id),
      resourceId: asString(row.resource_id),
      activeRunId: asString(row.active_run_id),
      status: asString(row.status) as StoredIntakeSession["status"],
      latestQuestions: deserializeJson<string[]>(row.latest_questions_json),
      result: deserializeJson<PromptBundle>(row.latest_result_json),
      createdAt: asString(row.created_at),
      updatedAt: asString(row.updated_at),
    };
  }

  async updateSession(input: {
    threadId: string;
    status: StoredIntakeSession["status"];
    latestQuestions?: string[] | null;
    result?: PromptBundle | null;
    activeRunId?: string;
  }): Promise<StoredIntakeSession> {
    const existing = await this.getSession(input.threadId);
    if (!existing) {
      throw new Error(`Unknown intake session "${input.threadId}"`);
    }

    const updatedAt = new Date().toISOString();
    const nextRunId = input.activeRunId ?? existing.activeRunId;
    const nextQuestions = input.latestQuestions ?? null;
    const nextResult = input.result ?? null;

    await this.client.execute(
      sql`
        UPDATE intake_sessions
        SET
          active_run_id = ${nextRunId},
          status = ${input.status},
          latest_questions_json = ${serializeJson(nextQuestions)},
          latest_result_json = ${serializeJson(nextResult)},
          updated_at = ${updatedAt}
        WHERE thread_id = ${input.threadId}
      `,
    );

    return {
      ...existing,
      activeRunId: nextRunId,
      status: input.status,
      latestQuestions: nextQuestions,
      result: nextResult,
      updatedAt,
    };
  }

  async deleteSession(threadId: string): Promise<void> {
    await this.client.execute(
      sql`
        DELETE FROM intake_sessions
        WHERE thread_id = ${threadId}
      `,
    );
  }

  async listSessions(): Promise<StoredIntakeSession[]> {
    const result = await this.client.execute(sql`
      SELECT
        thread_id,
        resource_id,
        active_run_id,
        status,
        latest_questions_json,
        latest_result_json,
        created_at,
        updated_at
      FROM intake_sessions
      ORDER BY created_at DESC
    `);

    return result.rows.map((row) => ({
      threadId: asString(row.thread_id),
      resourceId: asString(row.resource_id),
      activeRunId: asString(row.active_run_id),
      status: asString(row.status) as StoredIntakeSession["status"],
      latestQuestions: deserializeJson<string[]>(row.latest_questions_json),
      result: deserializeJson<PromptBundle>(row.latest_result_json),
      createdAt: asString(row.created_at),
      updatedAt: asString(row.updated_at),
    }));
  }
}

export class IntakeAssetStore {
  constructor(private readonly client: Client) {}

  async saveUpload(params: {
    threadId: string;
    buffer: Buffer;
    mimeType: string;
    originalFilename?: string;
  }): Promise<UploadRef> {
    const assetId = randomUUID();
    const extension = path.extname(params.originalFilename ?? "") || this.extensionFromMime(params.mimeType);
    const filename = `${assetId}${extension}`;
    const relativePath = path.join(params.threadId, normalizeFilename(filename));
    const absolutePath = path.join(serverConfig.assetDir, relativePath);
    const createdAt = new Date().toISOString();

    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, params.buffer);

    const dimensions = params.mimeType.startsWith("image/")
      ? imageSize(params.buffer)
      : undefined;
    const sha256 = createHash("sha256").update(params.buffer).digest("hex");

    await this.client.execute(
      sql`
        INSERT INTO intake_assets (
          asset_id,
          thread_id,
          storage_key,
          mime_type,
          width,
          height,
          original_filename,
          sha256,
          created_at
        )
        VALUES (
          ${assetId},
          ${params.threadId},
          ${relativePath},
          ${params.mimeType},
          ${dimensions?.width ?? null},
          ${dimensions?.height ?? null},
          ${params.originalFilename ?? null},
          ${sha256},
          ${createdAt}
        )
      `,
    );

    return {
      assetId,
      url: `/api/intake/assets/${assetId}`,
      mimeType: params.mimeType,
      width: dimensions?.width,
      height: dimensions?.height,
      originalFilename: params.originalFilename,
    };
  }

  async getAsset(assetId: string): Promise<StoredAsset | null> {
    const result = await this.client.execute(
      sql`
        SELECT
          asset_id,
          thread_id,
          storage_key,
          mime_type,
          width,
          height,
          original_filename,
          sha256,
          created_at
        FROM intake_assets
        WHERE asset_id = ${assetId}
      `,
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return {
      assetId: asString(row.asset_id),
      threadId: asString(row.thread_id),
      storageKey: asString(row.storage_key),
      mimeType: asString(row.mime_type),
      width: asNullableNumber(row.width),
      height: asNullableNumber(row.height),
      originalFilename: asNullableString(row.original_filename),
      sha256: asString(row.sha256),
      createdAt: asString(row.created_at),
    };
  }

  async getUploadsForThread(threadId: string, assetIds: string[]): Promise<UploadRef[]> {
    const uploads = await Promise.all(assetIds.map((assetId) => this.getAsset(assetId)));
    return uploads
      .filter((asset): asset is StoredAsset => asset !== null)
      .filter((asset) => asset.threadId === threadId)
      .map(toUploadRef);
  }

  async listAssetsForThread(threadId: string): Promise<StoredAsset[]> {
    const result = await this.client.execute(
      sql`
        SELECT
          asset_id,
          thread_id,
          storage_key,
          mime_type,
          width,
          height,
          original_filename,
          sha256,
          created_at
        FROM intake_assets
        WHERE thread_id = ${threadId}
        ORDER BY created_at ASC
      `,
    );

    return result.rows.map((row) => ({
      assetId: asString(row.asset_id),
      threadId: asString(row.thread_id),
      storageKey: asString(row.storage_key),
      mimeType: asString(row.mime_type),
      width: asNullableNumber(row.width),
      height: asNullableNumber(row.height),
      originalFilename: asNullableString(row.original_filename),
      sha256: asString(row.sha256),
      createdAt: asString(row.created_at),
    }));
  }

  async deleteAssetsForThread(threadId: string): Promise<void> {
    await this.client.execute(
      sql`
        DELETE FROM intake_assets
        WHERE thread_id = ${threadId}
      `,
    );
  }

  async readAsset(assetId: string): Promise<{ asset: StoredAsset; buffer: Buffer }> {
    const asset = await this.getAsset(assetId);
    if (!asset) {
      throw new Error(`Unknown asset "${assetId}"`);
    }
    const buffer = await fs.readFile(path.join(serverConfig.assetDir, asset.storageKey));
    return { asset, buffer };
  }

  async toDataUrl(assetId: string): Promise<string> {
    const { asset, buffer } = await this.readAsset(assetId);
    const base64 = buffer.toString("base64");
    return `data:${asset.mimeType};base64,${base64}`;
  }

  resolveAbsolutePath(asset: StoredAsset): string {
    return path.join(serverConfig.assetDir, asset.storageKey);
  }

  private extensionFromMime(mimeType: string): string {
    switch (mimeType) {
      case "image/jpeg":
        return ".jpg";
      case "image/png":
        return ".png";
      case "image/webp":
        return ".webp";
      default:
        return "";
    }
  }
}
