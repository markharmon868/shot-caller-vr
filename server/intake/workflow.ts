import { Agent } from "@mastra/core/agent";
import type { MastraDBMessage } from "@mastra/core/agent";
import { Mastra } from "@mastra/core/mastra";
import type { MastraCompositeStore } from "@mastra/core/storage";
import type { FullOutput } from "@mastra/core/stream";
import { createTool } from "@mastra/core/tools";
import { createStep, createWorkflow } from "@mastra/core/workflows";
import { Memory } from "@mastra/memory";
import { z } from "zod";

import {
  MeshyPromptSchema,
  type PromptBundle,
  PromptBundleSchema,
  type UploadRef,
} from "../../shared/contracts/intake.js";
import type { IntakeAssetStore } from "./storage.js";
import {
  extractIntakeDecision,
  deriveFallbackQuestions,
  isEmptyQuestionsValidationError,
  type IntakeDecision,
} from "./intake-decision.js";
import {
  buildPromptAgentMessage,
  buildStoredMessageParts,
  buildSubmittedTurnText,
  normalizeUserContext,
  type IntakeContext,
  type SubmittedTurn,
} from "./messages.js";

const AskUserQuestionsSchema = z.object({
  questions: z.array(z.string().min(1)).min(1),
  reason: z.string().min(1).optional(),
});

const SatisfiedSchema = z.object({
  summary: z.string().min(1),
});

const SubmittedTurnSchema = z.object({
  text: z.string().optional(),
  locationInput: z
    .object({
      address: z.string().optional(),
      mapsUrl: z.string().optional(),
    })
    .optional(),
  uploads: z.array(
    z.object({
      assetId: z.string(),
      url: z.string(),
      mimeType: z.string(),
      width: z.number().optional(),
      height: z.number().optional(),
      originalFilename: z.string().optional(),
    }),
  ),
});

const WorkflowInputSchema = z.object({
  threadId: z.string().min(1),
  resourceId: z.string().min(1),
  turn: SubmittedTurnSchema,
});

const WorkflowStateSchema = z.object({
  latestQuestions: z.array(z.string()).default([]),
  intakeSummary: z.string().optional(),
  imagePrompt: z
    .object({
      prompt: z.string(),
      sourceImageIds: z.array(z.string()),
    })
    .optional(),
  meshyPrompts: z.array(MeshyPromptSchema).default([]),
});

const GateStepOutputSchema = z.object({
  threadId: z.string(),
  resourceId: z.string(),
  intakeSummary: z.string(),
});

const SuspendPayloadSchema = z.object({
  questions: z.array(z.string().min(1)).min(1),
});

const IntakeContextSchema = z.object({
  threadId: z.string(),
  resourceId: z.string(),
  summary: z.string(),
  messages: z.array(
    z.object({
      id: z.string(),
      createdAt: z.string(),
      text: z.string(),
      images: z.array(
        z.object({
          assetId: z.string(),
          url: z.string(),
          mimeType: z.string(),
          width: z.number().optional(),
          height: z.number().optional(),
          originalFilename: z.string().optional(),
        }),
      ),
    }),
  ),
  allImages: z.array(
    z.object({
      assetId: z.string(),
      url: z.string(),
      mimeType: z.string(),
      width: z.number().optional(),
      height: z.number().optional(),
      originalFilename: z.string().optional(),
    }),
  ),
});

const ImagePromptOutputSchema = z.object({
  prompt: z.string().min(1),
  sourceImageIds: z.array(z.string().min(1)),
});

const MeshyPromptOutputSchema = z.object({
  prompts: z.array(MeshyPromptSchema).length(3),
});

type WorkflowInput = z.infer<typeof WorkflowInputSchema>;
type WorkflowState = z.infer<typeof WorkflowStateSchema>;
type GateStepOutput = z.infer<typeof GateStepOutputSchema>;

export interface IntakeWorkflowDeps {
  storage: MastraCompositeStore;
  memory: Memory;
  assetStore: IntakeAssetStore;
  models: {
    intake: string;
    imagePrompt: string;
    meshyPrompt: string;
  };
}

function last<T>(items: T[]): T | undefined {
  return items.length > 0 ? items[items.length - 1] : undefined;
}

function createTextOnlyUserMessage(turn: SubmittedTurn): Array<{ role: "user"; content: string }> {
  const text = buildSubmittedTurnText(turn) || "The user uploaded scout photos for this location.";
  const uploadSummary = turn.uploads.length > 0 ? `Uploaded scout photos: ${turn.uploads.map((upload) => upload.assetId).join(", ")}.` : "";
  return [
    {
      role: "user",
      content: [text, uploadSummary].filter(Boolean).join("\n"),
    },
  ];
}

async function patchStoredUserMessageWithUploads(params: {
  memory: Memory;
  output: FullOutput<unknown>;
  threadId: string;
  turn: SubmittedTurn;
}): Promise<void> {
  if (params.turn.uploads.length === 0) {
    return;
  }

  let latestUserMessage: MastraDBMessage | undefined;
  for (let index = params.output.messages.length - 1; index >= 0; index -= 1) {
    const message = params.output.messages[index];
    if (message.role === "user" && message.threadId === params.threadId) {
      latestUserMessage = message;
      break;
    }
  }

  if (!latestUserMessage) {
    return;
  }

  await params.memory.updateMessages({
    messages: [
      {
        id: latestUserMessage.id,
        content: {
          format: 2,
          parts: buildStoredMessageParts(params.turn),
          metadata: {
            attachmentIds: params.turn.uploads.map((upload) => upload.assetId),
            locationInput: params.turn.locationInput ?? null,
          },
        },
      },
    ],
  });
}

async function suspendWithFallbackQuestions<TSuspendResult>(params: {
  priorMessages: MastraDBMessage[];
  setState: (state: WorkflowState) => Promise<void>;
  suspend: (
    payload: { questions: string[] },
    options: { resumeLabel: string },
  ) => TSuspendResult | Promise<TSuspendResult>;
  nextState: WorkflowState;
  turn: SubmittedTurn;
}): Promise<TSuspendResult> {
  const questions = deriveFallbackQuestions({
    priorMessages: params.priorMessages,
    turn: params.turn,
  });

  await params.setState({
    ...params.nextState,
    latestQuestions: questions,
  });

  return await params.suspend(
    {
      questions,
    },
    { resumeLabel: "user-reply" },
  );
}

function createAskUserQuestionsTool() {
  return createTool({
    id: "ask_user_questions",
    description: "Ask the user the follow-up questions you still need answered.",
    inputSchema: AskUserQuestionsSchema,
    outputSchema: AskUserQuestionsSchema,
    execute: async (inputData) => inputData,
  });
}

function createSatisfiedTool() {
  return createTool({
    id: "satisfied",
    description: "Mark the intake as complete and summarize what the user needs.",
    inputSchema: SatisfiedSchema,
    outputSchema: SatisfiedSchema,
    execute: async (inputData) => inputData,
  });
}

function createIntakeAgent(memory: Memory, model: string) {
  const askUserQuestions = createAskUserQuestionsTool();
  const satisfied = createSatisfiedTool();

  return new Agent({
    id: "intake-agent",
    name: "Shot Caller Intake Agent",
    instructions: [
      "You are the intake gate for Shot Caller, a production blocking tool for filmmakers.",
      "You must decide whether the current intake has enough information to generate downstream prompts.",
      "You have exactly two tools and you must call one of them on every turn.",
      "Call ask_user_questions with 1 to 3 concise, specific follow-up questions when the user has not provided enough planning context.",
      "The questions array must never be empty.",
      "Call satisfied only when the intake is complete enough to generate one high-quality image prompt and three Meshy asset prompts.",
      "Do not answer conversationally without a tool call.",
      "If anything important is missing, ask targeted questions instead of making assumptions.",
      "Treat explicit negative answers as resolved constraints, not missing information. Examples: 'no images', 'no scout photos', 'no references', 'no action', 'no blocking', and 'no hero action'.",
      "Do not keep asking for scout photos, references, hero action, or blocking after the user has explicitly declined them.",
      "If the user has already provided a clear location, a scene idea, and a mood, weather, or time-of-day direction, that is usually enough to call satisfied even when they want no photos and no action.",
      "Do not ask generic catch-all questions when the intake is already sufficient for prompt generation. Prefer satisfied over extra questioning once the core creative constraints are clear.",
    ].join("\n"),
    model,
    tools: {
      ask_user_questions: askUserQuestions,
      satisfied,
    },
    memory,
  });
}

function createImagePromptAgent(model: string) {
  return new Agent({
    id: "image-prompt-agent",
    name: "Shot Caller Image Prompt Agent",
    instructions: [
      "Generate exactly one production-ready prompt for a high-fidelity image generation or image upscaling model.",
      "Your prompt will be used to generate a cohesive 360-degree environment image for world-model generation and Gaussian splat reconstruction of a real filming location.",
      "This is not concept art. Optimize for spatial fidelity, reconstruction quality, and real-world believability so the result can support desktop blocking and real-scale VR walkthrough validation.",
      "The result should feel operationally trustworthy, as if a filmmaker could use it to validate sightlines, entrances, actor approaches, crew clearances, and the overall spatial envelope at real scale.",
      "Treat the user context, location details, and attached reference images as ground truth for the place. Preserve the actual geometry, architecture, layout, scale, atmosphere, and distinctive location cues unless the user explicitly asks to change them.",
      "When reference images are present, infer the stable shared reality across them and resolve conflicts conservatively. Prefer location truth over embellishment.",
      "If the references cover only part of the location, extrapolate unseen areas conservatively from the available evidence. Extend the world with ordinary, location-consistent details instead of dramatic inventions.",
      "Write the prompt as instructions to generate one seamless 360-degree equirectangular panorama from a single fixed capture point, typically at standing eye level, unless the user explicitly requests a different viewpoint.",
      "Describe the full surrounding environment as one contiguous place, not a single framed hero shot. The front, sides, rear, ground plane, ceiling or sky, and mid-distance depth cues must all feel spatially continuous.",
      "Prioritize physically consistent geometry, walkable layout, scale, materials, lighting direction, shadows, reflections, weather, time of day, and object permanence around the full sphere.",
      "Preserve the user's blocking intent as environmental affordances and sightlines, but do not bake in temporary production-planning elements unless the user explicitly wants them physically present in the location.",
      "Do not include editor overlays, shot badges, UI, labels, FOV cones, light coverage cones, cameras, crew markers, cast marks, or other planning artifacts in the generated environment unless the user explicitly requests them.",
      "If the context suggests an exterior, preserve street width, curb lines, facades, entrances, windows, signage, vegetation, and horizon continuity. If it suggests an interior, preserve room proportions, wall openings, practical fixtures, major furniture footprints, and circulation paths.",
      "Use grounded cinematic language only when it does not harm reconstruction. Favor crisp detail, believable materials, naturalistic exposure, and stable surfaces over stylized or surreal imagery.",
      "Avoid prompt language that would damage splat reconstruction: split-screen compositions, multiple viewpoints, cropped hero shots, fisheye distortion, fragmented or duplicated objects, impossible geometry, floating elements, missing floors, disconnected backgrounds, non-Euclidean layouts, shallow depth of field, motion blur, heavy grain, lens dirt, chromatic aberration, extreme haze, or anything that obscures surfaces and edges.",
      "If people or vehicles are not explicitly required, keep the environment static and minimally populated to reduce reconstruction artifacts. If they are required, keep them sparse, coherent, and physically grounded.",
      "Use precise environmental descriptors instead of vague adjectives. Mention materials, architectural style, practical light sources, weather, wear, neighborhood or room character, and other concrete cues supported by the user context and references.",
      "The prompt in the `prompt` field must be a single dense model-ready paragraph with no bullets, no markdown, and no explanation.",
      "The `sourceImageIds` field must list only the attached image ids that materially informed the prompt. If no attached images were used, return an empty array.",
      "Return only structured output.",
    ].join("\n"),
    model,
  });
}

function createMeshyPromptAgent(model: string) {
  return new Agent({
    id: "meshy-prompt-agent",
    name: "Shot Caller Meshy Prompt Agent",
    instructions: [
      "Generate exactly three distinct Meshy.ai-ready 3D asset prompts based on the user context and image references.",
      "Each prompt should be specific, production-oriented, and clearly titled.",
      "Return only structured output.",
    ].join("\n"),
    model,
  });
}

export interface IntakeRuntime {
  mastra: Mastra;
  intakeWorkflow: ReturnType<Mastra["getWorkflow"]>;
  memory: Memory;
  intakeAgent: Agent;
  imagePromptAgent: Agent;
  meshyPromptAgent: Agent;
}

function baseWorkflowState(state?: Partial<WorkflowState>): WorkflowState {
  return {
    latestQuestions: [],
    meshyPrompts: [],
    ...state,
  };
}

export async function createIntakeRuntime(deps: IntakeWorkflowDeps): Promise<IntakeRuntime> {
  const intakeAgent = createIntakeAgent(deps.memory, deps.models.intake);
  const imagePromptAgent = createImagePromptAgent(deps.models.imagePrompt);
  const meshyPromptAgent = createMeshyPromptAgent(deps.models.meshyPrompt);

  const intakeGateStep = createStep({
    id: "intakeGateStep",
    inputSchema: WorkflowInputSchema,
    outputSchema: GateStepOutputSchema,
    stateSchema: WorkflowStateSchema,
    resumeSchema: SubmittedTurnSchema,
    suspendSchema: SuspendPayloadSchema,
    execute: async ({ inputData, resumeData, state, setState, suspend }) => {
      const turn = (resumeData ?? inputData.turn) as SubmittedTurn;
      const nextState = baseWorkflowState(state);
      const recalled = await deps.memory.recall({
        threadId: inputData.threadId,
        resourceId: inputData.resourceId,
        perPage: false,
        orderBy: { field: "createdAt", direction: "ASC" },
      });

      let output: FullOutput<unknown>;
      try {
        output = await intakeAgent.generate(createTextOnlyUserMessage(turn), {
          memory: {
            thread: inputData.threadId,
            resource: inputData.resourceId,
          },
          maxSteps: 4,
          toolChoice: "required",
        });
      } catch (error) {
        if (!isEmptyQuestionsValidationError(error)) {
          throw error;
        }
        return suspendWithFallbackQuestions({
          priorMessages: recalled.messages,
          setState,
          suspend,
          nextState,
          turn,
        });
      }

      await patchStoredUserMessageWithUploads({
        memory: deps.memory,
        output,
        threadId: inputData.threadId,
        turn,
      });

      let decision: IntakeDecision;
      try {
        const toolResult = last(output.toolResults);
        if (!toolResult) {
          throw new Error("The intake agent did not call a required decision tool.");
        }
        decision = extractIntakeDecision({
          toolResult,
          fallbackQuestions: deriveFallbackQuestions({
            priorMessages: recalled.messages,
            turn,
          }),
        });
      } catch (error) {
        if (!isEmptyQuestionsValidationError(error)) {
          throw error;
        }
        return suspendWithFallbackQuestions({
          priorMessages: recalled.messages,
          setState,
          suspend,
          nextState,
          turn,
        });
      }

      if (decision.toolName === "ask_user_questions") {
        await setState({
          ...nextState,
          latestQuestions: decision.payload.questions,
        });
        return suspend(
          {
            questions: decision.payload.questions,
          },
          { resumeLabel: "user-reply" },
        );
      }

      await setState({
        ...nextState,
        latestQuestions: [],
        intakeSummary: decision.payload.summary,
      });

      return {
        threadId: inputData.threadId,
        resourceId: inputData.resourceId,
        intakeSummary: decision.payload.summary,
      };
    },
  });

  const collectUserContextStep = createStep({
    id: "collectUserContextStep",
    inputSchema: GateStepOutputSchema,
    outputSchema: IntakeContextSchema,
    stateSchema: WorkflowStateSchema,
    execute: async ({ inputData, state, setState }) => {
      const nextState = baseWorkflowState(state);
      const recalled = await deps.memory.recall({
        threadId: inputData.threadId,
        resourceId: inputData.resourceId,
        perPage: false,
        orderBy: { field: "createdAt", direction: "ASC" },
      });

      const uploadsById = new Map<string, UploadRef>();
      for (const message of recalled.messages) {
        for (const part of message.content.parts) {
          if (part.type !== "image" || !("image" in part) || typeof part.image !== "string") {
            continue;
          }
          const match = part.image.match(/\/api\/intake\/assets\/([^/?#]+)/);
          const assetId = match?.[1];
          if (!assetId || uploadsById.has(assetId)) {
            continue;
          }
          const [upload] = await deps.assetStore.getUploadsForThread(inputData.threadId, [assetId]);
          if (upload) {
            uploadsById.set(upload.assetId, upload);
          }
        }
      }

      const context = normalizeUserContext({
        threadId: inputData.threadId,
        resourceId: inputData.resourceId,
        summary: inputData.intakeSummary,
        messages: recalled.messages,
        uploadsByAssetId: uploadsById,
      });

      await setState({
        ...nextState,
        intakeSummary: inputData.intakeSummary,
      });

      return context;
    },
  });

  const imagePromptStep = createStep({
    id: "imagePromptStep",
    inputSchema: IntakeContextSchema,
    outputSchema: ImagePromptOutputSchema,
    stateSchema: WorkflowStateSchema,
    execute: async ({ inputData, state, setState }) => {
      const nextState = baseWorkflowState(state);
      const dataUrls = new Map<string, string>();
      for (const image of inputData.allImages) {
        dataUrls.set(image.assetId, await deps.assetStore.toDataUrl(image.assetId));
      }

      const output = await imagePromptAgent.generate(buildPromptAgentMessage(inputData as IntakeContext, dataUrls), {
        structuredOutput: {
          schema: ImagePromptOutputSchema,
        },
        maxSteps: 1,
      });

      await setState({
        ...nextState,
        imagePrompt: output.object,
      });

      return output.object;
    },
  });

  const meshyPromptStep = createStep({
    id: "meshyPromptStep",
    inputSchema: ImagePromptOutputSchema,
    outputSchema: MeshyPromptOutputSchema,
    stateSchema: WorkflowStateSchema,
    execute: async ({ getStepResult, state, setState }) => {
      const nextState = baseWorkflowState(state);
      const context = getStepResult<typeof collectUserContextStep>(collectUserContextStep);
      const dataUrls = new Map<string, string>();
      for (const image of context.allImages) {
        dataUrls.set(image.assetId, await deps.assetStore.toDataUrl(image.assetId));
      }

      const output = await meshyPromptAgent.generate(buildPromptAgentMessage(context as IntakeContext, dataUrls), {
        structuredOutput: {
          schema: MeshyPromptOutputSchema,
        },
        maxSteps: 1,
      });

      await setState({
        ...nextState,
        meshyPrompts: output.object.prompts,
      });

      return output.object;
    },
  });

  const finalizePromptBundleStep = createStep({
    id: "finalizePromptBundleStep",
    inputSchema: MeshyPromptOutputSchema,
    outputSchema: PromptBundleSchema,
    stateSchema: WorkflowStateSchema,
    execute: async ({ inputData, getStepResult, runId }) => {
      const gate = getStepResult<typeof intakeGateStep>(intakeGateStep);
      const imagePrompt = getStepResult<typeof imagePromptStep>(imagePromptStep);
      const meshyPrompts = inputData.prompts;

      return {
        threadId: gate.threadId,
        runId,
        intakeSummary: gate.intakeSummary,
        imagePrompt,
        meshyPrompts,
      };
    },
  });

  const intakeWorkflow = createWorkflow({
    id: "intake-workflow",
    inputSchema: WorkflowInputSchema,
    outputSchema: PromptBundleSchema,
    stateSchema: WorkflowStateSchema,
  })
    .then(intakeGateStep)
    .then(collectUserContextStep)
    .then(imagePromptStep)
    .then(meshyPromptStep)
    .then(finalizePromptBundleStep)
    .commit();

  const mastra = new Mastra({
    storage: deps.storage,
    agents: {
      intakeAgent,
      imagePromptAgent,
      meshyPromptAgent,
    },
    workflows: {
      intakeWorkflow,
    },
    memory: {
      intake: deps.memory,
    },
  });

  return {
    mastra,
    intakeWorkflow: mastra.getWorkflow("intakeWorkflow"),
    memory: deps.memory,
    intakeAgent,
    imagePromptAgent,
    meshyPromptAgent,
  };
}
