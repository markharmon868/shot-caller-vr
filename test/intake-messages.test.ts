import test from "node:test";
import assert from "node:assert/strict";

import type { MastraDBMessage } from "@mastra/core/agent";

import type { UploadRef } from "../shared/contracts/intake.ts";
import {
  buildStoredMessageParts,
  buildSubmittedTurnText,
  normalizeUserContext,
  toConversationTurn,
} from "../server/intake/messages.ts";

function createMessage(input: {
  id: string;
  role: "user" | "assistant" | "system";
  createdAt: string;
  parts: Array<{ type: "text"; text: string } | ({ type: "image"; image: string; mimeType: string } & Record<string, unknown>)>;
}): MastraDBMessage {
  return {
    id: input.id,
    role: input.role,
    createdAt: new Date(input.createdAt),
    threadId: "thread-1",
    resourceId: "resource-1",
    content: {
      format: 2,
      parts: input.parts,
      metadata: {},
    },
  };
}

test("buildSubmittedTurnText keeps freeform text and visible location input", () => {
  const text = buildSubmittedTurnText({
    text: "Warm sunset exterior with a clean eyeline to the front door.",
    locationInput: {
      address: "2600 Lyon St, San Francisco",
      mapsUrl: "https://maps.google.com/example",
    },
    uploads: [],
  });

  assert.match(text, /Warm sunset exterior/);
  assert.match(text, /Street address: 2600 Lyon St, San Francisco/);
  assert.match(text, /Google Maps URL: https:\/\/maps\.google\.com\/example/);
});

test("normalizeUserContext keeps only informative user-authored text and images", () => {
  const upload: UploadRef = {
    assetId: "asset-1",
    url: "/api/intake/assets/asset-1",
    mimeType: "image/jpeg",
    originalFilename: "scout-1.jpg",
    width: 1200,
    height: 900,
  };

  const userMessage = createMessage({
    id: "msg-user",
    role: "user",
    createdAt: "2026-03-14T10:00:00.000Z",
    parts: buildStoredMessageParts({
      text: "Need a moody night exterior with glossy rain reflections.",
      locationInput: {
        address: "Mission District alley",
      },
      uploads: [upload],
    }),
  });

  const assistantMessage = createMessage({
    id: "msg-assistant",
    role: "assistant",
    createdAt: "2026-03-14T10:01:00.000Z",
    parts: [
      { type: "text", text: "What time of night should the scene feel like?" },
    ],
  });

  const context = normalizeUserContext({
    threadId: "thread-1",
    resourceId: "resource-1",
    summary: "Rainy cinematic alley sequence.",
    messages: [userMessage, assistantMessage],
    uploadsByAssetId: new Map([[upload.assetId, upload]]),
  });

  assert.equal(context.messages.length, 1);
  assert.equal(context.messages[0]?.id, "msg-user");
  assert.match(context.messages[0]?.text ?? "", /Mission District alley/);
  assert.deepEqual(context.allImages, [upload]);
});

test("toConversationTurn preserves stored image metadata for the transcript", () => {
  const turn = toConversationTurn(createMessage({
    id: "msg-user",
    role: "user",
    createdAt: "2026-03-14T10:00:00.000Z",
    parts: [
      {
        type: "image",
        image: "/api/intake/assets/asset-1",
        mimeType: "image/png",
        width: 2048,
        height: 1024,
        originalFilename: "reference.png",
      },
    ],
  }));

  assert.deepEqual(turn.parts, [
    {
      type: "image",
      assetId: "asset-1",
      url: "/api/intake/assets/asset-1",
      mimeType: "image/png",
      width: 2048,
      height: 1024,
      originalFilename: "reference.png",
    },
  ]);
});
