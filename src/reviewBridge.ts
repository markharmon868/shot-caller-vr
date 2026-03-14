import {
  ApprovalStatus,
  ReviewIssue,
  StageReviewMode,
  SceneStatus,
} from "./contracts/stageReview.js";

export interface ReviewBridgeState {
  sceneId: string;
  mode: StageReviewMode;
  xrSupported: boolean;
  xrActive: boolean;
  sceneStatus: SceneStatus;
  approvalStatus: ApprovalStatus;
  issueCount: number;
  selectedLabel: string | null;
  error: string | null;
}

export interface ReviewBridgeActions {
  toggleXR(): void;
  primaryAction(): void;
  secondaryAction(): void;
}

export interface ReviewBridge {
  getState(): ReviewBridgeState;
  subscribe(listener: (state: ReviewBridgeState) => void): () => void;
  setState(patch: Partial<ReviewBridgeState>): void;
  setActions(actions: ReviewBridgeActions): void;
  getActions(): ReviewBridgeActions | null;
}

const listeners = new Set<(state: ReviewBridgeState) => void>();

const state: ReviewBridgeState = {
  sceneId: "demo",
  mode: "viewer",
  xrSupported: false,
  xrActive: false,
  sceneStatus: "draft",
  approvalStatus: "pending",
  issueCount: 0,
  selectedLabel: null,
  error: null,
};

let actions: ReviewBridgeActions | null = null;

function emit(): void {
  for (const listener of listeners) {
    listener({ ...state });
  }
}

export const reviewBridge: ReviewBridge = {
  getState() {
    return { ...state };
  },
  subscribe(listener) {
    listeners.add(listener);
    listener({ ...state });
    return () => listeners.delete(listener);
  },
  setState(patch) {
    Object.assign(state, patch);
    emit();
  },
  setActions(nextActions) {
    actions = nextActions;
    emit();
  },
  getActions() {
    return actions;
  },
};

export function getPrimaryActionLabel(mode: StageReviewMode, xrActive: boolean): string {
  if (!xrActive) {
    if (mode === "export") return "Capture Export";
    if (mode === "stage4-xr" || mode === "stage5-xr") return "Enter XR";
    return "No Primary Action";
  }
  return mode === "stage5-xr" ? "Approve Scene" : "Flag Issue";
}

export function getSecondaryActionLabel(mode: StageReviewMode, xrActive: boolean): string {
  if (!xrActive) {
    if (mode === "export") return "Queue Payload";
    return "No Secondary Action";
  }
  return mode === "stage5-xr" ? "Reject Scene" : "Resolve Latest Issue";
}

export function getLatestOpenIssue(issues: ReviewIssue[]): ReviewIssue | null {
  for (let index = issues.length - 1; index >= 0; index -= 1) {
    const issue = issues[index];
    if (issue.status === "open") return issue;
  }
  return null;
}
