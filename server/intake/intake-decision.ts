import type { MastraDBMessage, MastraMessagePart } from "@mastra/core/agent";
import { z } from "zod";

import type { SubmittedTurn } from "./messages.js";

type ZodIssueLike = {
  code?: unknown;
  path?: unknown;
};

const AskUserQuestionsSchema = z.object({
  questions: z.array(z.string().min(1)).min(1),
  reason: z.string().min(1).optional(),
});

const SatisfiedSchema = z.object({
  summary: z.string().min(1),
});

type ToolResultLike = {
  payload?: {
    toolName?: unknown;
    result?: unknown;
    args?: unknown;
    isError?: unknown;
  };
};

export type IntakeDecision =
  | {
      toolName: "ask_user_questions";
      payload: z.infer<typeof AskUserQuestionsSchema>;
    }
  | {
      toolName: "satisfied";
      payload: z.infer<typeof SatisfiedSchema>;
    };

function hasQuestionTooSmallIssue(issues: unknown): boolean {
  if (!Array.isArray(issues)) {
    return false;
  }

  return issues.some((issue) => {
    const candidate = issue as ZodIssueLike;
    if (candidate.code !== "too_small") {
      return false;
    }
    return Array.isArray(candidate.path) && candidate.path.includes("questions");
  });
}

function hasQuestionTooSmallMessage(message: unknown): boolean {
  if (typeof message !== "string") {
    return false;
  }

  return message.includes("Array must contain at least 1 element(s)") && message.includes("\"questions\"");
}

function extractText(parts: MastraMessagePart[]): string {
  return parts
    .filter((part) => part.type === "text" && "text" in part)
    .map((part) => part.text)
    .join("\n")
    .trim();
}

function isLocationLine(line: string): boolean {
  return line.startsWith("Street address:") || line.startsWith("Google Maps URL:");
}

function hasImagePart(parts: MastraMessagePart[]): boolean {
  return parts.some((part) => part.type === "image");
}

function collectPriorUserSignals(messages: MastraDBMessage[]): {
  hasLocation: boolean;
  hasImages: boolean;
  freeformText: string;
} {
  let hasLocation = false;
  let hasImages = false;
  const freeformLines: string[] = [];

  for (const message of messages) {
    if (message.role !== "user") {
      continue;
    }

    const text = extractText(message.content.parts);
    if (text) {
      const lines = text
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      if (lines.some(isLocationLine)) {
        hasLocation = true;
      }

      freeformLines.push(...lines.filter((line) => !isLocationLine(line)));
    }

    if (hasImagePart(message.content.parts)) {
      hasImages = true;
    }
  }

  return {
    hasLocation,
    hasImages,
    freeformText: freeformLines.join("\n").trim(),
  };
}

function hasLightingOrTimingDetail(text: string): boolean {
  return /\b(dawn|sunrise|morning|day|afternoon|golden hour|dusk|sunset|night|midnight|blue hour|rain|fog|mist|overcast|sunny|lighting|light|mood|cinematic)\b/i.test(
    text,
  );
}

function explicitlyDeclinesImages(text: string): boolean {
  return /\b(no|without)\s+(images?|photos?|scout photos?|reference images?|references?)\b/i.test(text)
    || /\bno\s+scout\s+photos?\b/i.test(text)
    || /\bno\s+references?\b/i.test(text);
}

function hasCameraOrBlockingDetail(text: string): boolean {
  return /\b(camera|lens|framing|wide|close-up|close up|tracking|dolly|crane|handheld|blocking|staging|foreground|background|hero|entrance|doorway|gate|vehicle|walk-up|pull-up)\b/i.test(
    text,
  );
}

function explicitlyDeclinesActionOrBlocking(text: string): boolean {
  return /\b(no|without)\s+(action|actions|blocking|hero action|hero actions)\b/i.test(text)
    || /\bno\s+hero\s+action\b/i.test(text)
    || /\bno\s+blocking\b/i.test(text);
}

export function isEmptyQuestionsValidationError(error: unknown): boolean {
  const pending = [error];
  const visited = new Set<unknown>();

  while (pending.length > 0) {
    const current = pending.pop();
    if (!current || visited.has(current)) {
      continue;
    }
    visited.add(current);

    if (typeof current === "string") {
      if (hasQuestionTooSmallMessage(current)) {
        return true;
      }
      continue;
    }

    if (typeof current !== "object") {
      continue;
    }

    const candidate = current as {
      issues?: unknown;
      message?: unknown;
      cause?: unknown;
      error?: unknown;
      originalError?: unknown;
      errors?: unknown;
    };

    if (hasQuestionTooSmallIssue(candidate.issues) || hasQuestionTooSmallMessage(candidate.message)) {
      return true;
    }

    pending.push(candidate.cause, candidate.error, candidate.originalError);

    if (Array.isArray(candidate.errors)) {
      pending.push(...candidate.errors);
    }
  }

  return false;
}

export function deriveFallbackQuestions(params: {
  priorMessages: MastraDBMessage[];
  turn: SubmittedTurn;
}): string[] {
  const priorSignals = collectPriorUserSignals(params.priorMessages);
  const currentText = params.turn.text?.trim() ?? "";
  const currentHasLocation = Boolean(params.turn.locationInput?.address || params.turn.locationInput?.mapsUrl);
  const currentHasImages = params.turn.uploads.length > 0;

  const hasLocation = priorSignals.hasLocation || currentHasLocation;
  const hasImages = priorSignals.hasImages || currentHasImages;
  const freeformText = [priorSignals.freeformText, currentText].filter(Boolean).join("\n").trim();
  const declinedImages = explicitlyDeclinesImages(freeformText);
  const declinedActionOrBlocking = explicitlyDeclinesActionOrBlocking(freeformText);

  const questions: string[] = [];

  if (!hasLocation) {
    questions.push("What exact address or Google Maps link should this scene be based on?");
  }

  if (!freeformText) {
    questions.push("What are you trying to create here, including the scene type, mood, and the main visual goal?");
  }

  if (!hasImages && !declinedImages) {
    questions.push("Do you have any scout photos or reference images you want me to preserve as location truth?");
  }

  if (freeformText && !hasLightingOrTimingDetail(freeformText)) {
    questions.push("What time of day, weather, or lighting mood should the scene feel like?");
  }

  if (freeformText && !declinedActionOrBlocking && !hasCameraOrBlockingDetail(freeformText)) {
    questions.push("What camera framing, blocking, or hero action needs to be preserved in the shot?");
  }

  if (questions.length === 0) {
    questions.push("What is the single most important visual detail that must stay true in the generated result?");
  }

  return questions.slice(0, 3);
}

function readToolPayload(toolResult: unknown): ToolResultLike["payload"] {
  if (!toolResult || typeof toolResult !== "object" || !("payload" in toolResult)) {
    return undefined;
  }
  const payload = (toolResult as ToolResultLike).payload;
  return payload && typeof payload === "object" ? payload : undefined;
}

export function extractIntakeDecision(params: {
  toolResult: unknown;
  fallbackQuestions: string[];
}): IntakeDecision {
  const payload = readToolPayload(params.toolResult);
  const toolName = payload?.toolName;

  if (toolName === "ask_user_questions") {
    const parsedResult = AskUserQuestionsSchema.safeParse(payload?.result);
    if (parsedResult.success) {
      return {
        toolName,
        payload: parsedResult.data,
      };
    }

    const parsedArgs = AskUserQuestionsSchema.safeParse(payload?.args);
    if (parsedArgs.success) {
      return {
        toolName,
        payload: parsedArgs.data,
      };
    }

    return {
      toolName,
      payload: {
        questions: params.fallbackQuestions,
      },
    };
  }

  if (toolName === "satisfied") {
    const parsedResult = SatisfiedSchema.safeParse(payload?.result);
    if (parsedResult.success) {
      return {
        toolName,
        payload: parsedResult.data,
      };
    }

    const parsedArgs = SatisfiedSchema.safeParse(payload?.args);
    if (parsedArgs.success) {
      return {
        toolName,
        payload: parsedArgs.data,
      };
    }

    throw new Error("The intake agent called satisfied with an invalid payload.");
  }

  throw new Error(`Unexpected intake tool result "${String(toolName)}".`);
}
