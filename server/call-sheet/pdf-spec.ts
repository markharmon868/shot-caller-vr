import type { CallSheetPlan, PdfSpec } from "../../shared/contracts/call-sheet.js";
import { PdfSpecSchema } from "../../shared/contracts/call-sheet.js";
import type { NormalizedScene } from "./normalize.js";

const COLORS = {
  ink: { r: 0.08, g: 0.12, b: 0.18 },
  accent: { r: 0.14, g: 0.32, b: 0.48 },
  accentLight: { r: 0.89, g: 0.94, b: 0.97 },
  border: { r: 0.78, g: 0.84, b: 0.9 },
} as const;

function limitText(value: string, max = 120): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) {
    return trimmed;
  }
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function bulletText(items: string[], fallback: string): string {
  if (items.length === 0) {
    return fallback;
  }
  return items.map((item) => `• ${item}`).join("\n");
}

function buildTitlePage(plan: CallSheetPlan, normalizedScene: NormalizedScene) {
  const contactsRows = plan.titleBlock.generalCallTime || normalizedScene.metadata.contacts.length > 0
    ? [
        ["Field", "Value"],
        ["General Call", plan.titleBlock.generalCallTime ?? "TBD"],
        ["Location", plan.titleBlock.locationName],
        ["Address", plan.titleBlock.locationAddress ?? "TBD"],
        ["Shoot Date", plan.titleBlock.shootDate],
      ]
    : [
        ["Field", "Value"],
        ["Location", plan.titleBlock.locationName],
        ["Shoot Date", plan.titleBlock.shootDate],
      ];

  const contactsBlock = normalizedScene.metadata.contacts.length > 0
    ? normalizedScene.metadata.contacts.map((contact) => {
        const details = [contact.phone, contact.email].filter(Boolean).join(" / ");
        return `• ${contact.role}: ${contact.name}${details ? ` (${details})` : ""}`;
      }).join("\n")
    : "• No contact sheet provided in request metadata.";

  return {
    size: "Letter" as const,
    elements: [
      { type: "text" as const, x: 48, y: 742, text: plan.titleBlock.productionTitle, font: "HelveticaBold", fontSize: 26, color: COLORS.ink },
      { type: "text" as const, x: 48, y: 716, text: `${plan.titleBlock.sceneTitle} (${plan.titleBlock.sceneId})`, font: "Helvetica", fontSize: 14, color: COLORS.accent },
      { type: "line" as const, startX: 48, startY: 706, endX: 564, endY: 706, thickness: 1.2, color: COLORS.border },
      { type: "table" as const, x: 48, y: 684, rows: contactsRows, columnWidths: [124, 392], rowHeight: 22, headerBackground: COLORS.accentLight, padding: 6, fontSize: 10 },
      { type: "text" as const, x: 48, y: 548, text: "Executive Summary", font: "HelveticaBold", fontSize: 16, color: COLORS.ink },
      { type: "text" as const, x: 48, y: 526, text: bulletText(plan.executiveSummary, "• No executive summary was generated."), font: "Helvetica", fontSize: 11, lineHeight: 15, maxWidth: 516, color: COLORS.ink },
      { type: "text" as const, x: 48, y: 388, text: "Scene Overview", font: "HelveticaBold", fontSize: 16, color: COLORS.ink },
      { type: "text" as const, x: 48, y: 366, text: bulletText(normalizedScene.sceneSummary, "• No direct scene summary available."), font: "Helvetica", fontSize: 11, lineHeight: 15, maxWidth: 516, color: COLORS.ink },
      { type: "text" as const, x: 48, y: 274, text: "Contacts", font: "HelveticaBold", fontSize: 16, color: COLORS.ink },
      { type: "text" as const, x: 48, y: 252, text: contactsBlock, font: "Helvetica", fontSize: 11, lineHeight: 15, maxWidth: 516, color: COLORS.ink },
      { type: "text" as const, x: 48, y: 196, text: "Assumptions", font: "HelveticaBold", fontSize: 16, color: COLORS.ink },
      { type: "text" as const, x: 48, y: 174, text: bulletText(plan.assumptions, "• No assumptions were required."), font: "Helvetica", fontSize: 11, lineHeight: 14, maxWidth: 516, color: COLORS.ink },
    ],
  };
}

function buildCostPage(plan: CallSheetPlan) {
  const assetRows = [
    ["Asset", "Category", "Qty", "Daily", "Weekly", "Confidence"],
    ...plan.assets.map((asset) => [
      limitText(asset.label, 22),
      limitText(asset.category, 12),
      String(asset.quantity),
      `$${asset.dailyRate.toFixed(0)}`,
      `$${asset.weeklyRate.toFixed(0)}`,
      asset.confidence,
    ]),
  ];

  return {
    size: "Letter" as const,
    elements: [
      { type: "text" as const, x: 48, y: 742, text: "Cost and Equipment Summary", font: "HelveticaBold", fontSize: 22, color: COLORS.ink },
      { type: "text" as const, x: 48, y: 716, text: `Daily total: $${plan.costSummary.dailyTotal.toFixed(0)}   Weekly total: $${plan.costSummary.weeklyTotal.toFixed(0)}`, font: "Helvetica", fontSize: 12, color: COLORS.accent },
      { type: "table" as const, x: 48, y: 680, rows: assetRows, columnWidths: [190, 78, 34, 64, 64, 86], rowHeight: 22, headerBackground: COLORS.accentLight, padding: 5, fontSize: 9 },
      { type: "text" as const, x: 48, y: 362, text: "Pricing Notes", font: "HelveticaBold", fontSize: 16, color: COLORS.ink },
      { type: "text" as const, x: 48, y: 340, text: bulletText(plan.costSummary.pricingNotes, "• Pricing reflects matched catalog items only; unmatched assets remain unpriced."), font: "Helvetica", fontSize: 11, lineHeight: 15, maxWidth: 516, color: COLORS.ink },
    ],
  };
}

function buildShotPages(plan: CallSheetPlan) {
  return plan.shots.map((shot) => ({
    size: "Letter" as const,
    elements: [
      { type: "text" as const, x: 48, y: 742, text: `${shot.shotId} · ${shot.shotLabel}`, font: "HelveticaBold", fontSize: 22, color: COLORS.ink },
      { type: "text" as const, x: 48, y: 718, text: `${shot.shotType}${shot.inferred ? " · inferred from scene geometry" : ""}`, font: "Helvetica", fontSize: 12, color: COLORS.accent },
      { type: "rectangle" as const, x: 48, y: 648, width: 516, height: 50, color: COLORS.accentLight, borderColor: COLORS.border, borderWidth: 1 },
      { type: "text" as const, x: 58, y: 678, text: "Camera Setup", font: "HelveticaBold", fontSize: 13, color: COLORS.ink },
      { type: "text" as const, x: 58, y: 660, text: limitText(shot.cameraSetupSummary, 260), font: "Helvetica", fontSize: 10, maxWidth: 496, lineHeight: 14, color: COLORS.ink },
      { type: "text" as const, x: 48, y: 612, text: "Related Gear", font: "HelveticaBold", fontSize: 16, color: COLORS.ink },
      { type: "text" as const, x: 48, y: 590, text: bulletText([
        `Lights: ${shot.relatedLights.length > 0 ? shot.relatedLights.join(", ") : "None explicitly linked"}`,
        `Assets: ${shot.relatedAssets.length > 0 ? shot.relatedAssets.join(", ") : "None explicitly linked"}`,
        `Props: ${shot.relatedProps.length > 0 ? shot.relatedProps.join(", ") : "None explicitly linked"}`,
      ], "• No related gear listed."), font: "Helvetica", fontSize: 11, maxWidth: 516, lineHeight: 15, color: COLORS.ink },
      { type: "text" as const, x: 48, y: 494, text: "Blocking Notes", font: "HelveticaBold", fontSize: 16, color: COLORS.ink },
      { type: "text" as const, x: 48, y: 472, text: bulletText(shot.blockingNotes, "• No blocking notes were generated."), font: "Helvetica", fontSize: 11, maxWidth: 516, lineHeight: 15, color: COLORS.ink },
      { type: "text" as const, x: 48, y: 352, text: "Estimated Setup Notes", font: "HelveticaBold", fontSize: 16, color: COLORS.ink },
      { type: "text" as const, x: 48, y: 330, text: bulletText(shot.estimatedSetupNotes, "• No setup notes were generated."), font: "Helvetica", fontSize: 11, maxWidth: 516, lineHeight: 15, color: COLORS.ink },
      { type: "text" as const, x: 48, y: 210, text: "Shot Assumptions", font: "HelveticaBold", fontSize: 16, color: COLORS.ink },
      { type: "text" as const, x: 48, y: 188, text: bulletText(shot.assumptionsUsed, "• No shot-specific assumptions were needed."), font: "Helvetica", fontSize: 11, maxWidth: 516, lineHeight: 15, color: COLORS.ink },
    ],
  }));
}

function buildFinalPage(plan: CallSheetPlan) {
  const placementRows = [
    ["Placement", "Coordinates", "Notes"],
    ...plan.placementSummary.map((item) => [
      limitText(item.label, 18),
      item.coordinates,
      limitText(item.notes.join("; ") || "No extra note", 46),
    ]),
  ];

  return {
    size: "Letter" as const,
    elements: [
      { type: "text" as const, x: 48, y: 742, text: "Placement, Department, and Risk Notes", font: "HelveticaBold", fontSize: 22, color: COLORS.ink },
      { type: "table" as const, x: 48, y: 702, rows: placementRows, columnWidths: [160, 112, 244], rowHeight: 22, headerBackground: COLORS.accentLight, padding: 5, fontSize: 9 },
      { type: "text" as const, x: 48, y: 420, text: "Department Notes", font: "HelveticaBold", fontSize: 16, color: COLORS.ink },
      { type: "text" as const, x: 48, y: 398, text: bulletText(plan.departmentNotes.flatMap((note) => note.notes.map((entry) => `${note.department}: ${entry}`)), "• No department notes were generated."), font: "Helvetica", fontSize: 11, maxWidth: 516, lineHeight: 15, color: COLORS.ink },
      { type: "text" as const, x: 48, y: 260, text: "Risk and Safety", font: "HelveticaBold", fontSize: 16, color: COLORS.ink },
      { type: "text" as const, x: 48, y: 238, text: bulletText(plan.riskAndSafetyNotes, "• No additional safety risks were generated."), font: "Helvetica", fontSize: 11, maxWidth: 516, lineHeight: 15, color: COLORS.ink },
      { type: "text" as const, x: 48, y: 132, text: "Open Questions", font: "HelveticaBold", fontSize: 16, color: COLORS.ink },
      { type: "text" as const, x: 48, y: 110, text: bulletText(plan.openQuestions, "• No open questions remain."), font: "Helvetica", fontSize: 11, maxWidth: 516, lineHeight: 14, color: COLORS.ink },
    ],
  };
}

export function buildCallSheetPdfSpec(plan: CallSheetPlan, normalizedScene: NormalizedScene): PdfSpec {
  const spec = {
    title: `${plan.titleBlock.productionTitle} Call Sheet`,
    author: "Shot Caller",
    pages: [
      buildTitlePage(plan, normalizedScene),
      buildCostPage(plan),
      ...buildShotPages(plan),
      buildFinalPage(plan),
    ],
  };

  return PdfSpecSchema.parse(spec);
}
