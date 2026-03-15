import test from "node:test";
import assert from "node:assert/strict";

import type { MastraDBMessage } from "@mastra/core/agent";

import {
  deriveFallbackQuestions,
  extractIntakeDecision,
  isEmptyQuestionsValidationError,
} from "../server/intake/intake-decision.ts";
import { buildStoredMessageParts } from "../server/intake/messages.ts";
import type { UploadRef } from "../shared/contracts/intake.ts";

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

test("isEmptyQuestionsValidationError matches the empty-questions zod issue", () => {
  const error = {
    issues: [
      {
        code: "too_small",
        minimum: 1,
        type: "array",
        inclusive: true,
        exact: false,
        message: "Array must contain at least 1 element(s)",
        path: ["questions"],
      },
    ],
  };

  assert.equal(isEmptyQuestionsValidationError(error), true);
});

test("isEmptyQuestionsValidationError matches nested cause chains from tool parsing", () => {
  const error = {
    name: "AI_InvalidToolArgumentsError",
    message: "Invalid arguments for tool ask_user_questions",
    cause: {
      issues: [
        {
          code: "too_small",
          minimum: 1,
          type: "array",
          inclusive: true,
          exact: false,
          message: "Array must contain at least 1 element(s)",
          path: ["questions"],
        },
      ],
    },
  };

  assert.equal(isEmptyQuestionsValidationError(error), true);
});

test("isEmptyQuestionsValidationError matches zod JSON messages", () => {
  const error = new Error(
    '[ { "code": "too_small", "minimum": 1, "type": "array", "inclusive": true, "exact": false, "message": "Array must contain at least 1 element(s)", "path": [ "questions" ] } ]',
  );

  assert.equal(isEmptyQuestionsValidationError(error), true);
});

test("deriveFallbackQuestions asks for missing location, brief, and references", () => {
  const questions = deriveFallbackQuestions({
    priorMessages: [],
    turn: {
      uploads: [],
    },
  });

  assert.equal(questions.length, 3);
  assert.match(questions[0] ?? "", /address|Maps link/i);
  assert.match(questions[1] ?? "", /trying to create|visual goal/i);
  assert.match(questions[2] ?? "", /photos|reference images/i);
});

test("deriveFallbackQuestions uses prior thread context to avoid redundant asks", () => {
  const upload: UploadRef = {
    assetId: "asset-1",
    url: "/api/intake/assets/asset-1",
    mimeType: "image/jpeg",
    originalFilename: "scout.jpg",
  };

  const priorUserMessage = createMessage({
    id: "msg-1",
    role: "user",
    createdAt: "2026-03-14T10:00:00.000Z",
    parts: buildStoredMessageParts({
      text: "Need a cinematic townhouse exterior with a vehicle pull-up at the curb.",
      locationInput: {
        address: "2600 Lyon St, San Francisco, CA",
      },
      uploads: [upload],
    }),
  });

  const questions = deriveFallbackQuestions({
    priorMessages: [priorUserMessage],
    turn: {
      text: "Make it feel expensive and grounded.",
      uploads: [],
    },
  });

  assert.equal(questions.some((question) => /address|Maps link/i.test(question)), false);
  assert.equal(questions.some((question) => /photos|reference images/i.test(question)), false);
  assert.ok(questions.length >= 1);
});

test("deriveFallbackQuestions treats explicit no-image answers as satisfied", () => {
  const questions = deriveFallbackQuestions({
    priorMessages: [],
    turn: {
      text: "Rainy morning version of Fort Mason. No images, no scout photos, no references.",
      uploads: [],
    },
  });

  assert.equal(questions.some((question) => /photos|reference images/i.test(question)), false);
});

test("deriveFallbackQuestions treats explicit no-action answers as satisfied", () => {
  const questions = deriveFallbackQuestions({
    priorMessages: [],
    turn: {
      text: "Light mood. No action, no blocking, no hero action.",
      uploads: [],
    },
  });

  assert.equal(questions.some((question) => /camera framing|blocking|hero action/i.test(question)), false);
});

test("extractIntakeDecision falls back when ask_user_questions result is invalid", () => {
  const decision = extractIntakeDecision({
    toolResult: {
      payload: {
        toolName: "ask_user_questions",
        result: {
          questions: [],
        },
      },
    },
    fallbackQuestions: [
      "What exact address or Google Maps link should this scene be based on?",
    ],
  });

  assert.deepEqual(decision, {
    toolName: "ask_user_questions",
    payload: {
      questions: [
        "What exact address or Google Maps link should this scene be based on?",
      ],
    },
  });
});

test("extractIntakeDecision accepts valid ask_user_questions args when result is absent", () => {
  const decision = extractIntakeDecision({
    toolResult: {
      payload: {
        toolName: "ask_user_questions",
        args: {
          questions: [
            "What time of day, weather, or lighting mood should the scene feel like?",
          ],
        },
      },
    },
    fallbackQuestions: [
      "What exact address or Google Maps link should this scene be based on?",
    ],
  });

  assert.deepEqual(decision, {
    toolName: "ask_user_questions",
    payload: {
      questions: [
        "What time of day, weather, or lighting mood should the scene feel like?",
      ],
    },
  });
});
