import { randomUUID } from "../utils/randomUUID.js";
import { ZodError } from "zod";
import type {
  ConversationPart,
  ConversationTurn,
  CreateThreadResponse,
  IntakeThreadState,
  IntakeTurnResponse,
  PromptBundle,
  UploadRef,
} from "../../shared/contracts/intake.js";
import {
  CreateThreadResponseSchema,
  IntakeThreadStateSchema,
  IntakeTurnResponseSchema,
} from "../../shared/contracts/intake.js";

const RESOURCE_STORAGE_KEY = "shot-caller:intake-resource-id";
const THREAD_STORAGE_KEY = "shot-caller:intake-thread-id";
const DEMO_INPUTS = {
  address: "2600 Lyon St, San Francisco, CA",
  mapsUrl: "https://maps.google.com/?q=2600+Lyon+St+San+Francisco+CA",
  text: [
    "I want a premium dusk exterior previs for a luxury townhouse on a steep San Francisco street.",
    "Keep the facade elegant, the sidewalk damp from recent rain, and the scene grounded in real neighborhood context.",
    "The camera should feel cinematic and deliberate, with room for cast blocking at the front gate and a vehicle pull-up at curbside.",
    "Preserve any uploaded scout imagery as location truth and ask follow-up questions if wardrobe, lighting mood, or hero props are still unclear.",
  ].join("\n"),
} as const;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function resourceId(): string {
  const existing = globalThis.localStorage.getItem(RESOURCE_STORAGE_KEY);
  if (existing) {
    return existing;
  }
  const next = randomUUID();
  globalThis.localStorage.setItem(RESOURCE_STORAGE_KEY, next);
  return next;
}

type ComposerPreview = {
  file: File;
  objectUrl: string;
};

export class IntakeApp {
  private root: HTMLElement;
  private threadId: string | null = null;
  private state: IntakeThreadState | null = null;
  private pendingFiles: ComposerPreview[] = [];
  private isSubmitting = false;
  private resourceId = resourceId();

  constructor(root: HTMLElement) {
    this.root = root;
  }

  async start(): Promise<void> {
    this.render();
    this.bindEvents();
    await this.ensureThread();
    await this.refresh();
  }

  private render(): void {
    this.root.innerHTML = `
      <div class="intake-shell">
        <div class="intake-header">
          <div>
            <p class="intake-kicker">Stage 1 Intake</p>
            <h1>Shot Caller</h1>
            <p class="intake-subtitle">Location input, scout imagery, and conversational intake for downstream prompt generation.</p>
          </div>
          <div class="intake-header-actions">
            <button id="intake-use-demo" class="intake-button intake-button-secondary">Use Demo Inputs</button>
            <button id="intake-new-thread" class="intake-button intake-button-secondary">New Draft</button>
          </div>
        </div>

        <section class="intake-demo-card">
          <div>
            <p class="intake-demo-kicker">How To See The Agent Work</p>
            <h2>Run the intake on this page and watch the workflow branch.</h2>
            <ol class="intake-demo-list">
              <li>Use the demo inputs or enter your own address, Maps URL, brief, and scout photos.</li>
              <li>Send an intake turn. The agent will either ask follow-up questions or mark the intake satisfied.</li>
              <li>Keep replying in the same thread until the prompt bundle is generated below.</li>
            </ol>
          </div>
          <p id="intake-live-status" class="intake-live-status">This page creates a thread automatically and keeps all turns on that same thread.</p>
        </section>

        <section id="intake-agent-state" class="intake-agent-card"></section>

        <div class="intake-grid">
          <section class="intake-panel intake-panel-form">
            <div class="intake-panel-header">
              <span>Location Input</span>
              <span id="intake-status-badge" class="intake-status-badge">collecting</span>
            </div>
            <label class="intake-field">
              <span>Street Address</span>
              <input id="intake-address" type="text" placeholder="2600 Lyon St, San Francisco" />
            </label>
            <label class="intake-field">
              <span>Google Maps URL</span>
              <input id="intake-maps-url" type="text" placeholder="https://maps.google.com/..." />
            </label>
            <label class="intake-field">
              <span>What are you trying to create?</span>
              <textarea id="intake-text" rows="5" placeholder="Describe the scene, mood, camera intent, blocking, and anything the prompt agents should preserve."></textarea>
            </label>
            <label class="intake-upload">
              <span>Scout Photos</span>
              <input id="intake-files" type="file" accept="image/*" multiple />
            </label>
            <div id="intake-pending-previews" class="intake-preview-grid"></div>
            <div class="intake-actions">
              <button id="intake-submit" class="intake-button intake-button-primary">Send Intake Turn</button>
            </div>
            <p id="intake-error" class="intake-error" hidden></p>
          </section>

          <section class="intake-panel intake-panel-questions">
            <div class="intake-panel-header">
              <span>Follow-up Questions</span>
              <span class="intake-panel-hint">From ask_user_questions()</span>
            </div>
            <div id="intake-questions" class="intake-question-list">
              <p class="intake-muted">The workflow will list pending follow-up questions here.</p>
            </div>
          </section>

          <section class="intake-panel intake-panel-transcript">
            <div class="intake-panel-header">
              <span>Thread Transcript</span>
              <span id="intake-thread-id" class="intake-panel-hint">—</span>
            </div>
            <div id="intake-transcript" class="intake-transcript"></div>
          </section>

          <section class="intake-panel intake-panel-result">
            <div class="intake-panel-header">
              <span>Prompt Bundle</span>
              <span class="intake-panel-hint">Final workflow output</span>
            </div>
            <div id="intake-result" class="intake-result">
              <p class="intake-muted">The structured prompt bundle will appear here once the workflow reaches satisfied().</p>
            </div>
          </section>
        </div>
      </div>
    `;
  }

  private bindEvents(): void {
    this.byId<HTMLButtonElement>("intake-submit").addEventListener("click", () => {
      void this.submitTurn();
    });
    this.byId<HTMLInputElement>("intake-files").addEventListener("change", (event) => {
      const target = event.currentTarget as HTMLInputElement;
      this.pendingFiles.forEach((file) => URL.revokeObjectURL(file.objectUrl));
      this.pendingFiles = Array.from(target.files ?? []).map((file) => ({
        file,
        objectUrl: URL.createObjectURL(file),
      }));
      this.renderPendingFiles();
    });
    this.byId<HTMLButtonElement>("intake-use-demo").addEventListener("click", () => {
      this.applyDemoInputs();
    });
    this.byId<HTMLButtonElement>("intake-new-thread").addEventListener("click", () => {
      void this.resetThread();
    });
  }

  private byId<T extends HTMLElement>(id: string): T {
    const element = document.getElementById(id) as T | null;
    if (!element) {
      throw new Error(`Missing element #${id}`);
    }
    return element;
  }

  private threadStorageValue(): string | null {
    return new URL(window.location.href).searchParams.get("thread")
      ?? globalThis.localStorage.getItem(THREAD_STORAGE_KEY);
  }

  private async ensureThread(forceNew = false): Promise<void> {
    if (!forceNew) {
      const existing = this.threadStorageValue();
      if (existing) {
        this.threadId = existing;
        this.syncThreadUrl(existing);
        return;
      }
    }

    const response = await this.request<CreateThreadResponse>("/api/intake/threads", {
      method: "POST",
    }, CreateThreadResponseSchema);
    this.threadId = response.threadId;
    globalThis.localStorage.setItem(THREAD_STORAGE_KEY, response.threadId);
    this.syncThreadUrl(response.threadId);
  }

  private async resetThread(): Promise<void> {
    globalThis.localStorage.removeItem(THREAD_STORAGE_KEY);
    this.threadId = null;
    this.state = null;
    this.clearComposer();
    await this.ensureThread(true);
    await this.refresh();
  }

  private syncThreadUrl(threadId: string): void {
    const url = new URL(window.location.href);
    url.searchParams.set("thread", threadId);
    window.history.replaceState({}, "", url.toString());
  }

  private async refresh(): Promise<void> {
    if (!this.threadId) {
      return;
    }

    this.state = await this.request<IntakeThreadState>(
      `/api/intake/threads/${this.threadId}`,
      { method: "GET" },
      IntakeThreadStateSchema,
    );
    this.renderState();
  }

  private async submitTurn(): Promise<void> {
    if (!this.threadId || this.isSubmitting || this.state?.status === "prompt_bundle_ready") {
      return;
    }

    this.setError(null);
    this.isSubmitting = true;
    this.byId<HTMLButtonElement>("intake-submit").disabled = true;
    this.renderState();

    try {
      const uploads = await this.uploadPendingFiles();
      const address = this.byId<HTMLInputElement>("intake-address").value.trim();
      const mapsUrl = this.byId<HTMLInputElement>("intake-maps-url").value.trim();
      const text = this.byId<HTMLTextAreaElement>("intake-text").value.trim();

      const response = await this.request<IntakeTurnResponse>(
        `/api/intake/threads/${this.threadId}/turns`,
        {
          method: "POST",
          body: JSON.stringify({
            text: text || undefined,
            attachments: uploads.map((upload) => upload.assetId),
            locationInput: address || mapsUrl
              ? {
                  address: address || undefined,
                  mapsUrl: mapsUrl || undefined,
                }
              : undefined,
          }),
        },
        IntakeTurnResponseSchema,
      );

      if (response.status === "needs_user_input") {
        this.clearComposer();
      } else if (response.status === "prompt_bundle_ready") {
        this.clearComposer();
      }

      await this.refresh();
    } catch (error) {
      this.setError(this.formatRequestError(error));
    } finally {
      this.isSubmitting = false;
      this.byId<HTMLButtonElement>("intake-submit").disabled = false;
      this.renderState();
    }
  }

  private applyDemoInputs(): void {
    this.byId<HTMLInputElement>("intake-address").value = DEMO_INPUTS.address;
    this.byId<HTMLInputElement>("intake-maps-url").value = DEMO_INPUTS.mapsUrl;
    this.byId<HTMLTextAreaElement>("intake-text").value = DEMO_INPUTS.text;
    this.setError(null);
  }

  private async uploadPendingFiles(): Promise<UploadRef[]> {
    if (!this.threadId || this.pendingFiles.length === 0) {
      return [];
    }

    const formData = new FormData();
    for (const preview of this.pendingFiles) {
      formData.append("files", preview.file, preview.file.name);
    }

    const response = await fetch(`/api/intake/threads/${this.threadId}/attachments`, {
      method: "POST",
      headers: {
        "x-shot-caller-resource-id": this.resourceId,
      },
      body: formData,
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: "Upload failed." }));
      throw new Error(typeof payload.error === "string" ? payload.error : "Upload failed.");
    }

    return (await response.json()) as UploadRef[];
  }

  private clearComposer(): void {
    this.byId<HTMLInputElement>("intake-address").value = "";
    this.byId<HTMLInputElement>("intake-maps-url").value = "";
    this.byId<HTMLTextAreaElement>("intake-text").value = "";
    this.byId<HTMLInputElement>("intake-files").value = "";
    this.pendingFiles.forEach((preview) => URL.revokeObjectURL(preview.objectUrl));
    this.pendingFiles = [];
    this.renderPendingFiles();
  }

  private renderPendingFiles(): void {
    const container = this.byId<HTMLDivElement>("intake-pending-previews");
    if (this.pendingFiles.length === 0) {
      container.innerHTML = "";
      return;
    }
    container.innerHTML = this.pendingFiles
      .map((preview) => `
        <figure class="intake-preview-card">
          <img src="${preview.objectUrl}" alt="${escapeHtml(preview.file.name)}" />
          <figcaption>${escapeHtml(preview.file.name)}</figcaption>
        </figure>
      `)
      .join("");
  }

  private renderState(): void {
    const statusBadge = this.byId<HTMLSpanElement>("intake-status-badge");
    const liveStatus = this.byId<HTMLParagraphElement>("intake-live-status");
    const agentState = this.byId<HTMLDivElement>("intake-agent-state");
    const transcript = this.byId<HTMLDivElement>("intake-transcript");
    const questions = this.byId<HTMLDivElement>("intake-questions");
    const result = this.byId<HTMLDivElement>("intake-result");
    const threadLabel = this.byId<HTMLSpanElement>("intake-thread-id");
    const submitButton = this.byId<HTMLButtonElement>("intake-submit");

    if (!this.state) {
      agentState.innerHTML = this.renderAgentState();
      liveStatus.textContent = this.isSubmitting
        ? "Agent is reviewing your intake..."
        : "This page creates a thread automatically and keeps all turns on that same thread.";
      submitButton.disabled = this.isSubmitting;
      submitButton.textContent = this.isSubmitting ? "Agent Is Reviewing..." : "Send Intake Turn";
      return;
    }

    statusBadge.textContent = this.state.status;
    statusBadge.dataset.status = this.state.status;
    threadLabel.textContent = this.state.threadId;
    submitButton.disabled = this.state.status === "prompt_bundle_ready" || this.isSubmitting;
    submitButton.textContent = this.isSubmitting ? "Agent Is Reviewing..." : "Send Intake Turn";
    liveStatus.textContent = this.isSubmitting
      ? "Agent is reviewing your intake on the current thread."
      : `Current thread: ${this.state.threadId}`;

    agentState.innerHTML = this.renderAgentState();

    const transcriptTurns = this.state.transcript.map((turn) => this.renderTurn(turn));
    if (this.state.latestQuestions && this.state.latestQuestions.length > 0) {
      transcriptTurns.push(this.renderSyntheticAssistantTurn(this.state.latestQuestions));
    }

    transcript.innerHTML = transcriptTurns.length > 0
      ? transcriptTurns.join("")
      : `<p class="intake-muted">No transcript yet. Start with an address, a Maps URL, a scout photo set, or a short scene brief.</p>`;

    questions.innerHTML = this.state.latestQuestions && this.state.latestQuestions.length > 0
      ? `<ol>${this.state.latestQuestions.map((question) => `<li>${escapeHtml(question)}</li>`).join("")}</ol>`
      : `<p class="intake-muted">No pending follow-up questions.</p>`;

    result.innerHTML = this.state.result
      ? this.renderPromptBundle(this.state.result)
      : `<p class="intake-muted">The structured prompt bundle will appear here once the workflow reaches satisfied().</p>`;
  }

  private renderAgentState(): string {
    if (this.isSubmitting) {
      return `
        <div class="intake-agent-card-inner intake-agent-card-reviewing">
          <p class="intake-agent-card-kicker">Agent Status</p>
          <h2>Agent is reviewing your intake.</h2>
          <p>The current thread is being evaluated against the shared memory history before the workflow decides whether to ask more questions or generate prompts.</p>
        </div>
      `;
    }

    if (!this.state) {
      return `
        <div class="intake-agent-card-inner">
          <p class="intake-agent-card-kicker">Agent Status</p>
          <h2>Thread is booting.</h2>
          <p>The intake page is creating a thread and preparing shared memory for the first turn.</p>
        </div>
      `;
    }

    if (this.state.result) {
      return `
        <div class="intake-agent-card-inner intake-agent-card-success">
          <p class="intake-agent-card-kicker">Agent Decision</p>
          <h2>Intake satisfied. Prompt bundle is ready.</h2>
          <p>The workflow finished the intake gate and structured the downstream image and Meshy prompts for this thread.</p>
        </div>
      `;
    }

    if (this.state.latestQuestions && this.state.latestQuestions.length > 0) {
      return `
        <div class="intake-agent-card-inner intake-agent-card-questions">
          <p class="intake-agent-card-kicker">Agent Decision</p>
          <h2>Agent needs more detail.</h2>
          <ol class="intake-agent-question-list">
            ${this.state.latestQuestions.map((question) => `<li>${escapeHtml(question)}</li>`).join("")}
          </ol>
        </div>
      `;
    }

    return `
      <div class="intake-agent-card-inner">
        <p class="intake-agent-card-kicker">Agent Status</p>
        <h2>Ready for the next intake turn.</h2>
        <p>Send location context, a scene brief, or scout photos. The workflow will keep using this thread-scoped memory until it has enough detail.</p>
      </div>
    `;
  }

  private renderTurn(turn: ConversationTurn): string {
    const parts = turn.parts.map((part) => this.renderPart(part)).join("");
    return `
      <article class="intake-turn intake-turn-${turn.role}">
        <header>
          <span>${escapeHtml(turn.role)}</span>
          <time>${new Date(turn.createdAt).toLocaleString()}</time>
        </header>
        <div class="intake-turn-parts">${parts}</div>
      </article>
    `;
  }

  private renderSyntheticAssistantTurn(questions: string[]): string {
    return `
      <article class="intake-turn intake-turn-assistant intake-turn-synthetic">
        <header>
          <span>assistant</span>
          <time>pending follow-up</time>
        </header>
        <div class="intake-turn-parts">
          <p class="intake-turn-text">I need a bit more detail before I can finish the prompt bundle.</p>
          <ol class="intake-assistant-question-list">
            ${questions.map((question) => `<li>${escapeHtml(question)}</li>`).join("")}
          </ol>
        </div>
      </article>
    `;
  }

  private renderPart(part: ConversationPart): string {
    if (part.type === "text") {
      return `<p class="intake-turn-text">${escapeHtml(part.text)}</p>`;
    }
    return `
      <figure class="intake-turn-image">
        <img src="${part.url}" alt="${escapeHtml(part.originalFilename ?? part.assetId)}" />
        <figcaption>${escapeHtml(part.originalFilename ?? part.assetId)}</figcaption>
      </figure>
    `;
  }

  private renderPromptBundle(bundle: PromptBundle): string {
    return `
      <section class="intake-result-block">
        <h3>Intake Summary</h3>
        <p>${escapeHtml(bundle.intakeSummary)}</p>
      </section>
      <section class="intake-result-block">
        <h3>Image Prompt</h3>
        <p>${escapeHtml(bundle.imagePrompt.prompt)}</p>
        <p class="intake-result-meta">Source images: ${escapeHtml(bundle.imagePrompt.sourceImageIds.join(", ") || "none")}</p>
      </section>
      <section class="intake-result-block">
        <h3>Meshy Prompts</h3>
        ${bundle.meshyPrompts.map((prompt) => `
          <article class="intake-result-prompt">
            <h4>${escapeHtml(prompt.title)}</h4>
            <p>${escapeHtml(prompt.prompt)}</p>
            <p class="intake-result-meta">Source images: ${escapeHtml(prompt.sourceImageIds.join(", ") || "none")}</p>
          </article>
        `).join("")}
      </section>
    `;
  }

  private setError(message: string | null): void {
    const element = this.byId<HTMLParagraphElement>("intake-error");
    element.hidden = !message;
    element.textContent = message ?? "";
  }

  private formatRequestError(error: unknown): string {
    if (error instanceof ZodError) {
      return "The intake service returned an invalid response. Restart the server and try a new draft.";
    }

    return error instanceof Error ? error.message : "Failed to submit intake turn.";
  }

  private async request<T>(input: string, init: RequestInit, schema: { parse(value: unknown): T }): Promise<T> {
    const response = await fetch(input, {
      ...init,
      headers: {
        "x-shot-caller-resource-id": this.resourceId,
        ...(init.body ? { "content-type": "application/json" } : {}),
        ...(init.headers ?? {}),
      },
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: `Request failed: ${response.status}` }));
      throw new Error(typeof payload.error === "string" ? payload.error : `Request failed: ${response.status}`);
    }

    return schema.parse(await response.json());
  }
}

export async function startIntake(): Promise<void> {
  const root = document.getElementById("intake-root");
  if (!root) {
    throw new Error("Missing intake root.");
  }
  const app = new IntakeApp(root);
  await app.start();
}
