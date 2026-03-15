import type { MastraDBMessage, MastraMessagePart } from "@mastra/core/agent";

import type {
  ConversationPart,
  ConversationTurn,
  LocationInput,
  UploadRef,
} from "../../shared/contracts/intake.js";

export interface SubmittedTurn {
  text?: string;
  locationInput?: LocationInput;
  uploads: UploadRef[];
}

export interface NormalizedUserMessage {
  id: string;
  createdAt: string;
  text: string;
  images: UploadRef[];
}

export interface IntakeContext {
  threadId: string;
  resourceId: string;
  summary: string;
  messages: NormalizedUserMessage[];
  allImages: UploadRef[];
}

function compactLines(lines: Array<string | undefined>): string[] {
  return lines.map((line) => line?.trim()).filter((line): line is string => Boolean(line));
}

export function buildSubmittedTurnText(turn: SubmittedTurn): string {
  const lines = compactLines([
    turn.text,
    turn.locationInput?.address ? `Street address: ${turn.locationInput.address}` : undefined,
    turn.locationInput?.mapsUrl ? `Google Maps URL: ${turn.locationInput.mapsUrl}` : undefined,
    turn.uploads.length > 0 && !turn.text
      ? `The user uploaded ${turn.uploads.length} scout photo(s) for this location.`
      : undefined,
  ]);

  return lines.join("\n");
}

export function buildStoredMessageParts(turn: SubmittedTurn): Array<
  { type: "text"; text: string } | ({ type: "image"; image: string; mimeType: string } & UploadRef)
> {
  const text = buildSubmittedTurnText(turn);
  const parts: Array<
    { type: "text"; text: string } | ({ type: "image"; image: string; mimeType: string } & UploadRef)
  > = [];

  if (text) {
    parts.push({ type: "text", text });
  }

  for (const upload of turn.uploads) {
    parts.push({
      ...upload,
      type: "image",
      image: upload.url,
      mimeType: upload.mimeType,
    });
  }

  return parts;
}

function extractTextFromParts(parts: MastraMessagePart[]): string {
  return parts
    .filter((part) => part.type === "text")
    .map((part) => ("text" in part ? part.text : ""))
    .join("\n")
    .trim();
}

function parseAssetId(imageUrl: string): string | null {
  const match = imageUrl.match(/\/api\/intake\/assets\/([^/?#]+)/);
  return match?.[1] ?? null;
}

export function toConversationTurn(message: MastraDBMessage): ConversationTurn {
  const parts: ConversationPart[] = [];

  for (const part of message.content.parts) {
    if (part.type === "text" && "text" in part) {
      parts.push({ type: "text", text: part.text });
      continue;
    }

    if (part.type === "image" && "image" in part && typeof part.image === "string") {
      const assetId = parseAssetId(part.image);
      if (!assetId) {
        continue;
      }
      parts.push({
        type: "image",
        assetId,
        url: part.image,
        mimeType: "mimeType" in part && typeof part.mimeType === "string" ? part.mimeType : "image/jpeg",
        width: "width" in part && typeof part.width === "number" ? part.width : undefined,
        height: "height" in part && typeof part.height === "number" ? part.height : undefined,
        originalFilename:
          "originalFilename" in part && typeof part.originalFilename === "string"
            ? part.originalFilename
            : undefined,
      });
    }
  }

  return {
    id: message.id,
    role: message.role,
    createdAt: message.createdAt.toISOString(),
    parts,
  };
}

export function buildPromptAgentMessage(context: IntakeContext, dataUrls: Map<string, string>): Array<{
  role: "user";
  content: Array<{ type: "image"; image: string; mimeType: string } | { type: "text"; text: string }>;
}> {
  const content: Array<{ type: "image"; image: string; mimeType: string } | { type: "text"; text: string }> = [];

  for (const image of context.allImages) {
    const dataUrl = dataUrls.get(image.assetId);
    if (!dataUrl) {
      continue;
    }
    content.push({
      type: "image",
      image: dataUrl,
      mimeType: image.mimeType,
    });
  }

  const narrative = context.messages
    .map((message, index) => {
      const chunks = compactLines([
        `Message ${index + 1}: ${message.text || "User supplied image reference only."}`,
        message.images.length > 0 ? `Attached image ids: ${message.images.map((image) => image.assetId).join(", ")}` : undefined,
      ]);
      return chunks.join("\n");
    })
    .join("\n\n");

  content.push({
    type: "text",
    text: [
      `Intake summary: ${context.summary}`,
      "Use the following user-authored context to produce the requested structured output.",
      narrative || "The user supplied only image references.",
    ].join("\n\n"),
  });

  return [{ role: "user", content }];
}

export function normalizeUserContext(params: {
  threadId: string;
  resourceId: string;
  summary: string;
  messages: MastraDBMessage[];
  uploadsByAssetId: Map<string, UploadRef>;
}): IntakeContext {
  const normalizedMessages: NormalizedUserMessage[] = [];
  const allImages: UploadRef[] = [];

  for (const message of params.messages) {
    if (message.role !== "user") {
      continue;
    }

    const text = extractTextFromParts(message.content.parts);
    const images: UploadRef[] = [];

    for (const part of message.content.parts) {
      if (part.type !== "image" || !("image" in part) || typeof part.image !== "string") {
        continue;
      }
      const assetId = parseAssetId(part.image);
      if (!assetId) {
        continue;
      }
      const upload = params.uploadsByAssetId.get(assetId);
      if (upload) {
        images.push(upload);
      }
    }

    if (!text && images.length === 0) {
      continue;
    }

    normalizedMessages.push({
      id: message.id,
      createdAt: message.createdAt.toISOString(),
      text,
      images,
    });
    allImages.push(...images);
  }

  return {
    threadId: params.threadId,
    resourceId: params.resourceId,
    summary: params.summary,
    messages: normalizedMessages,
    allImages,
  };
}
