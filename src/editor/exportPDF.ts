/**
 * Export shot list as a styled PDF for filmmakers.
 */
import { jsPDF } from "jspdf";
import type { SceneData } from "./SceneState.js";
import { getCatalogItemById } from "./assetCatalog.js";

const AMBER = [232, 160, 32] as const;
const WHITE = [240, 240, 240] as const;
const DARK = [20, 20, 20] as const;
const MUTED = [128, 128, 128] as const;
const GREEN = [52, 211, 153] as const;

function pageHeader(doc: jsPDF, title: string, subtitle: string): void {
  doc.setFillColor(...DARK);
  doc.rect(0, 0, 210, 40, "F");
  doc.setTextColor(...AMBER);
  doc.setFontSize(20);
  doc.text("SHOT CALLER", 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(...WHITE);
  doc.text(title, 14, 26);
  doc.text(new Date().toLocaleDateString(), 196, 26, { align: "right" });
  doc.setFontSize(8);
  doc.setTextColor(...AMBER);
  doc.text(subtitle, 14, 35);
  doc.setDrawColor(...AMBER);
  doc.line(14, 38, 196, 38);
}

export function exportShotListPDF(data: SceneData, title = "Untitled Scene"): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // ── PAGE 1: Shot List ────────────────────────────────────────────────────
  pageHeader(doc, title, "SHOT LIST");

  // Column headers
  doc.setFontSize(8);
  doc.setTextColor(...AMBER);
  doc.text("SHOT", 14, 46);
  doc.text("LABEL", 32, 46);
  doc.text("TYPE", 100, 46);
  doc.text("POSITION (X, Y, Z)", 130, 46);

  doc.setDrawColor(42, 42, 42);
  doc.line(14, 48, 196, 48);

  // Shot rows — cameras sorted by shot number
  const cameras = data.elements
    .filter((e) => e.type === "camera")
    .sort((a, b) => {
      const sa = (a.properties?.shotNumber as number) ?? 999;
      const sb = (b.properties?.shotNumber as number) ?? 999;
      return sa - sb;
    });

  let y = 56;

  if (cameras.length === 0) {
    doc.setTextColor(...MUTED);
    doc.setFontSize(10);
    doc.text("No cameras placed. Add cameras and use Sequence Mode to build your shot list.", 14, y);
  } else {
    for (let i = 0; i < cameras.length; i++) {
      const cam = cameras[i];
      const shotNum = String((cam.properties?.shotNumber as number) ?? i + 1).padStart(2, "0");
      doc.setTextColor(...WHITE);
      doc.setFontSize(9);
      doc.text(shotNum, 14, y);
      doc.text(cam.name ?? `Camera ${i + 1}`, 32, y);
      doc.setTextColor(...MUTED);
      doc.text(String(cam.properties?.shotType ?? "—"), 100, y);
      doc.setTextColor(...WHITE);
      const pos = cam.position ?? [0, 0, 0];
      doc.text(
        `${Number(pos[0]).toFixed(1)}, ${Number(pos[1]).toFixed(1)}, ${Number(pos[2]).toFixed(1)}`,
        130,
        y
      );
      doc.setDrawColor(42, 42, 42);
      doc.line(14, y + 3, 196, y + 3);
      y += 10;
      if (y > 275) {
        doc.addPage();
        y = 20;
      }
    }
  }

  // ── PAGE 2: Equipment & Budget ───────────────────────────────────────────
  doc.addPage();
  pageHeader(doc, title, "EQUIPMENT LIST & BUDGET ESTIMATE");

  doc.setFontSize(8);
  doc.setTextColor(...AMBER);
  doc.text("ITEM", 14, 46);
  doc.text("TYPE", 80, 46);
  doc.text("DAILY RATE", 130, 46);
  doc.text("WEEKLY RATE", 162, 46);

  doc.setDrawColor(42, 42, 42);
  doc.line(14, 48, 196, 48);

  y = 56;
  let totalDailyRate = 0;

  for (const el of data.elements) {
    // Resolve rate: element-level override, catalog lookup, or zero
    let dailyRate = el.dailyRate ?? 0;
    let weeklyRate = 0;
    let rateSource = "";

    const catalogId = el.assetId ?? (el.properties?.assetId as string | undefined);
    if (catalogId) {
      const item = getCatalogItemById(catalogId);
      if (item) {
        if (!dailyRate) dailyRate = item.dailyRate;
        weeklyRate = item.weeklyRate;
        rateSource = item.name;
      }
    }
    if (!weeklyRate && dailyRate) weeklyRate = dailyRate * 5;

    totalDailyRate += dailyRate;

    const typeLabel = el.type.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());

    doc.setTextColor(...WHITE);
    doc.setFontSize(9);
    doc.text(el.name, 14, y);
    doc.setTextColor(...MUTED);
    doc.text(typeLabel, 80, y);

    if (dailyRate > 0) {
      doc.setTextColor(...GREEN);
      doc.text(`$${dailyRate.toLocaleString()}`, 130, y);
      doc.text(`$${weeklyRate.toLocaleString()}`, 162, y);
    } else {
      doc.setTextColor(...MUTED);
      doc.text("—", 130, y);
      doc.text("—", 162, y);
    }

    if (rateSource && rateSource !== el.name) {
      doc.setTextColor(64, 64, 64);
      doc.setFontSize(7);
      doc.text(rateSource, 14, y + 4);
      y += 4;
    }

    doc.setDrawColor(32, 32, 32);
    doc.line(14, y + 3, 196, y + 3);
    y += 10;
    if (y > 260) {
      doc.addPage();
      y = 20;
    }
  }

  // Budget totals
  y += 4;
  doc.setDrawColor(...AMBER);
  doc.setLineWidth(0.4);
  doc.line(14, y, 196, y);
  y += 6;

  doc.setFontSize(11);
  doc.setTextColor(...WHITE);
  doc.text("ESTIMATED DAILY BUDGET", 14, y);
  doc.setTextColor(...AMBER);
  doc.text(`$${totalDailyRate.toLocaleString()}`, 196, y, { align: "right" });

  y += 6;
  doc.setFontSize(9);
  doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  doc.text("ESTIMATED WEEKLY BUDGET", 14, y);
  doc.setTextColor(...GREEN);
  doc.text(`$${(totalDailyRate * 5).toLocaleString()}`, 196, y, { align: "right" });

  y += 10;
  doc.setFontSize(7);
  doc.setTextColor(64, 64, 64);
  doc.text("* Rates are estimates based on standard industry day rates. Actual costs may vary.", 14, y);
  doc.text("  Items without a catalog association show $0. Rates do not include crew, location, or post-production.", 14, y + 4);

  doc.setLineWidth(0.2);

  const base = title.replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").toLowerCase().replace(/^-+|-+$/g, "") || "shot-list";
  doc.save(`${base}-shot-list.pdf`);
}
