import { z } from "zod";

export const IntakeSessionStatusSchema = z.enum([
  "collecting",
  "needs_user_input",
  "prompt_bundle_ready",
  "failed",
]);

export type IntakeSessionStatus = z.infer<typeof IntakeSessionStatusSchema>;

export const UploadRefSchema = z.object({
  assetId: z.string().min(1),
  url: z.string().min(1),
  mimeType: z.string().min(1),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  originalFilename: z.string().min(1).optional(),
});

export type UploadRef = z.infer<typeof UploadRefSchema>;

export const LocationInputSchema = z.object({
  address: z.string().trim().min(1).optional(),
  mapsUrl: z.string().trim().min(1).optional(),
});

export type LocationInput = z.infer<typeof LocationInputSchema>;

export const IntakeTurnRequestSchema = z.object({
  text: z.string().trim().max(4000).optional(),
  attachments: z.array(z.string().min(1)).default([]),
  locationInput: LocationInputSchema.optional(),
});

export type IntakeTurnRequest = z.infer<typeof IntakeTurnRequestSchema>;

export const ConversationTextPartSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
});

export const ConversationImagePartSchema = z.object({
  type: z.literal("image"),
  assetId: z.string().min(1),
  url: z.string().min(1),
  mimeType: z.string().min(1),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  originalFilename: z.string().min(1).optional(),
});

export const ConversationPartSchema = z.union([
  ConversationTextPartSchema,
  ConversationImagePartSchema,
]);

export type ConversationPart = z.infer<typeof ConversationPartSchema>;

export const ConversationTurnSchema = z.object({
  id: z.string().min(1),
  role: z.enum(["user", "assistant", "system"]),
  createdAt: z.string().datetime(),
  parts: z.array(ConversationPartSchema),
});

export type ConversationTurn = z.infer<typeof ConversationTurnSchema>;

export const ImagePromptSchema = z.object({
  prompt: z.string().min(1),
  sourceImageIds: z.array(z.string().min(1)),
});

export type ImagePrompt = z.infer<typeof ImagePromptSchema>;

export const MeshyPromptSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  prompt: z.string().min(1),
  sourceImageIds: z.array(z.string().min(1)),
});

export type MeshyPrompt = z.infer<typeof MeshyPromptSchema>;

export const PromptBundleSchema = z.object({
  threadId: z.string().min(1),
  runId: z.string().min(1),
  intakeSummary: z.string().min(1),
  imagePrompt: ImagePromptSchema,
  meshyPrompts: z.array(MeshyPromptSchema).length(3),
});

export type PromptBundle = z.infer<typeof PromptBundleSchema>;

export const CreateThreadResponseSchema = z.object({
  threadId: z.string().min(1),
  resourceId: z.string().min(1),
  runId: z.string().min(1),
  status: z.literal("collecting"),
});

export type CreateThreadResponse = z.infer<typeof CreateThreadResponseSchema>;

export const NeedsUserInputResponseSchema = z.object({
  status: z.literal("needs_user_input"),
  threadId: z.string().min(1),
  runId: z.string().min(1),
  questions: z.array(z.string().min(1)).min(1),
});

export type NeedsUserInputResponse = z.infer<typeof NeedsUserInputResponseSchema>;

export const PromptBundleReadyResponseSchema = z.object({
  status: z.literal("prompt_bundle_ready"),
  threadId: z.string().min(1),
  runId: z.string().min(1),
  result: PromptBundleSchema,
});

export type PromptBundleReadyResponse = z.infer<typeof PromptBundleReadyResponseSchema>;

export const IntakeTurnResponseSchema = z.union([
  NeedsUserInputResponseSchema,
  PromptBundleReadyResponseSchema,
]);

export type IntakeTurnResponse = z.infer<typeof IntakeTurnResponseSchema>;

export const IntakeThreadStateSchema = z.object({
  threadId: z.string().min(1),
  resourceId: z.string().min(1),
  status: IntakeSessionStatusSchema,
  transcript: z.array(ConversationTurnSchema),
  latestQuestions: z.array(z.string().min(1)).optional(),
  result: PromptBundleSchema.optional(),
});

export type IntakeThreadState = z.infer<typeof IntakeThreadStateSchema>;
