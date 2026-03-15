/**
 * Export shot list as a styled PDF for filmmakers.
 */
import { jsPDF } from "jspdf";
import type { SceneData } from "./SceneState.js";

const AMBER = [232, 160, 32] as const;
const WHITE = [240, 240, 240] as const;
const DARK = [20, 20, 20] as const;
const MUTED = [128, 128, 128] as const;

export function exportShotListPDF(data: SceneData, title = "Untitled Scene"): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // Header
  doc.setFillColor(...DARK);
  doc.rect(0, 0, 210, 40, "F");
  doc.setTextColor(...AMBER);
  doc.setFontSize(20);
  doc.text("SHOT CALLER", 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(...WHITE);
  doc.text(title, 14, 26);
  doc.text(new Date().toLocaleDateString(), 196, 26, { align: "right" });

  doc.setDrawColor(...AMBER);
  doc.line(14, 32, 196, 32);

  // Column headers
  doc.setFontSize(8);
  doc.setTextColor(...AMBER);
  doc.text("SHOT", 14, 40);
  doc.text("LABEL", 32, 40);
  doc.text("POSITION (X, Y, Z)", 110, 40);

  doc.setDrawColor(42, 42, 42);
  doc.line(14, 42, 196, 42);

  // Shot rows — cameras sorted by shot number (sequence order)
  const cameras = data.elements
    .filter((e) => e.type === "camera")
    .sort((a, b) => {
      const sa = (a.properties?.shotNumber as number) ?? 999;
      const sb = (b.properties?.shotNumber as number) ?? 999;
      return sa - sb;
    });
  let y = 50;

  if (cameras.length === 0) {
    doc.setTextColor(...MUTED);
    doc.setFontSize(10);
    doc.text("No cameras placed. Add cameras and use Sequence Mode to build your shot list.", 14, y);
  } else {
    for (let i = 0; i < cameras.length; i++) {
      const cam = cameras[i];
      const shotNum = String(i + 1).padStart(2, "0");
      doc.setTextColor(...WHITE);
      doc.setFontSize(9);
      doc.text(shotNum, 14, y);
      doc.text(cam.name ?? `Camera ${i + 1}`, 32, y);
      const pos = cam.position ?? [0, 0, 0];
      doc.text(
        `${Number(pos[0]).toFixed(1)}, ${Number(pos[1]).toFixed(1)}, ${Number(pos[2]).toFixed(1)}`,
        110,
        y
      );
      doc.setDrawColor(42, 42, 42);
      doc.line(14, y + 3, 196, y + 3);
      y += 12;
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    }
  }

  const base = title.replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").toLowerCase().replace(/^-+|-+$/g, "") || "shot-list";
  const filename = base ? `${base}-shot-list.pdf` : "shot-list.pdf";
  doc.save(filename);
}
