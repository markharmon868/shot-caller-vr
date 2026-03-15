/**
 * CameraAnnotations — Engelbart principle: Shared mental model
 * Each camera element should support structured annotations for the crew
 */

export interface CameraAnnotation {
  lens: string; // "35mm" | "50mm" | "85mm" | "24mm wide"
  movement: string; // "static" | "dolly in" | "handheld" | "crane"
  notes: string; // Director's intent — free text
  mood: string; // "tense" | "intimate" | "epic" | "observational"
  lighting: string; // "natural" | "dramatic" | "fill" | "motivated"
}

export const DEFAULT_ANNOTATION: CameraAnnotation = {
  lens: "50mm",
  movement: "static",
  notes: "",
  mood: "",
  lighting: "natural",
};

export const LENS_OPTIONS = ["18mm", "24mm", "35mm", "50mm", "85mm", "135mm", "200mm"];

export const MOVEMENT_OPTIONS = [
  "static",
  "dolly in",
  "dolly out",
  "handheld",
  "crane up",
  "crane down",
  "track left",
  "track right",
  "pan",
  "tilt",
];

export const MOOD_OPTIONS = ["tense", "intimate", "epic", "observational", "playful", "somber"];

export const LIGHTING_OPTIONS = [
  "natural",
  "dramatic",
  "fill",
  "motivated",
  "high-key",
  "low-key",
  "silhouette",
];

/**
 * Render camera annotation fields for the properties panel
 */
export function renderCameraAnnotationFields(annotation: CameraAnnotation): string {
  return `
    <div class="prop-group">
      <div class="prop-label">LENS</div>
      <select class="prop-select" id="ann-lens">
        ${LENS_OPTIONS.map(
          (l) => `<option ${annotation.lens === l ? "selected" : ""}>${l}</option>`,
        ).join("")}
      </select>
    </div>
    <div class="prop-group">
      <div class="prop-label">MOVEMENT</div>
      <select class="prop-select" id="ann-movement">
        ${MOVEMENT_OPTIONS.map(
          (m) => `<option ${annotation.movement === m ? "selected" : ""}>${m}</option>`,
        ).join("")}
      </select>
    </div>
    <div class="prop-group">
      <div class="prop-label">MOOD</div>
      <select class="prop-select" id="ann-mood">
        <option value="">— Not specified —</option>
        ${MOOD_OPTIONS.map(
          (m) => `<option ${annotation.mood === m ? "selected" : ""}>${m}</option>`,
        ).join("")}
      </select>
    </div>
    <div class="prop-group">
      <div class="prop-label">LIGHTING</div>
      <select class="prop-select" id="ann-lighting">
        ${LIGHTING_OPTIONS.map(
          (l) => `<option ${annotation.lighting === l ? "selected" : ""}>${l}</option>`,
        ).join("")}
      </select>
    </div>
    <div class="prop-group">
      <div class="prop-label">DIRECTOR NOTES</div>
      <textarea class="prop-textarea" id="ann-notes" rows="3" placeholder="What is the intent of this shot?">${
        annotation.notes
      }</textarea>
    </div>
  `;
}

/**
 * Bind annotation field events to update callback
 */
export function bindAnnotationEvents(onChange: (annotation: CameraAnnotation) => void): void {
  const lensEl = document.getElementById("ann-lens") as HTMLSelectElement | null;
  const movementEl = document.getElementById("ann-movement") as HTMLSelectElement | null;
  const moodEl = document.getElementById("ann-mood") as HTMLSelectElement | null;
  const lightingEl = document.getElementById("ann-lighting") as HTMLSelectElement | null;
  const notesEl = document.getElementById("ann-notes") as HTMLTextAreaElement | null;

  const update = (): void => {
    if (!lensEl || !movementEl || !moodEl || !lightingEl || !notesEl) return;
    onChange({
      lens: lensEl.value,
      movement: movementEl.value,
      mood: moodEl.value,
      lighting: lightingEl.value,
      notes: notesEl.value,
    });
  };

  lensEl?.addEventListener("change", update);
  movementEl?.addEventListener("change", update);
  moodEl?.addEventListener("change", update);
  lightingEl?.addEventListener("change", update);
  notesEl?.addEventListener("input", update);
}
