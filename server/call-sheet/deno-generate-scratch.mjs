import { dirname } from "jsr:@std/path@1";
import {
  PDFDocument,
  StandardFonts,
  degrees,
  rgb,
} from "npm:pdf-lib@1.17.1";

const PAGE_SIZES = {
  A4: [595.28, 841.89],
  Letter: [612, 792],
  Legal: [612, 1008],
};

function resolveSize(size) {
  if (Array.isArray(size)) {
    return size;
  }
  return PAGE_SIZES[size] ?? PAGE_SIZES.Letter;
}

function toColor(color) {
  if (!color) {
    return undefined;
  }
  return rgb(color.r, color.g, color.b);
}

function getFont(fonts, name) {
  return fonts[name ?? "Helvetica"] ?? fonts.Helvetica;
}

function drawText(page, element, fonts) {
  page.drawText(element.text, {
    x: element.x,
    y: element.y,
    size: element.fontSize,
    font: getFont(fonts, element.font),
    color: toColor(element.color),
    maxWidth: element.maxWidth,
    lineHeight: element.lineHeight,
    rotate: element.rotate ? degrees(element.rotate) : undefined,
  });
}

function drawLine(page, element) {
  page.drawLine({
    start: { x: element.startX, y: element.startY },
    end: { x: element.endX, y: element.endY },
    thickness: element.thickness ?? 1,
    color: toColor(element.color) ?? rgb(0, 0, 0),
  });
}

function drawRectangle(page, element) {
  page.drawRectangle({
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
    color: toColor(element.color),
    borderColor: toColor(element.borderColor),
    borderWidth: element.borderWidth ?? 0,
  });
}

function drawTable(page, element, fonts) {
  const padding = element.padding ?? 4;
  const fontSize = element.fontSize ?? 10;
  const font = fonts.Helvetica;
  let y = element.y;

  element.rows.forEach((row, rowIndex) => {
    let x = element.x;
    const isHeader = rowIndex === 0;
    const rowWidth = element.columnWidths.reduce((sum, width) => sum + width, 0);

    page.drawRectangle({
      x,
      y: y - element.rowHeight,
      width: rowWidth,
      height: element.rowHeight,
      color: isHeader && element.headerBackground ? toColor(element.headerBackground) : undefined,
      borderColor: rgb(0.78, 0.84, 0.9),
      borderWidth: 0.75,
    });

    row.forEach((cell, cellIndex) => {
      const cellWidth = element.columnWidths[cellIndex] ?? 80;
      page.drawRectangle({
        x,
        y: y - element.rowHeight,
        width: cellWidth,
        height: element.rowHeight,
        borderColor: rgb(0.78, 0.84, 0.9),
        borderWidth: 0.75,
      });
      page.drawText(String(cell), {
        x: x + padding,
        y: y - element.rowHeight + padding + 3,
        size: fontSize,
        font,
        maxWidth: cellWidth - padding * 2,
        lineHeight: fontSize + 1,
      });
      x += cellWidth;
    });

    y -= element.rowHeight;
  });
}

async function render(spec) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(spec.title);
  pdf.setAuthor(spec.author ?? "Shot Caller");

  const fonts = {
    Helvetica: await pdf.embedFont(StandardFonts.Helvetica),
    HelveticaBold: await pdf.embedFont(StandardFonts.HelveticaBold),
    HelveticaOblique: await pdf.embedFont(StandardFonts.HelveticaOblique),
    TimesRoman: await pdf.embedFont(StandardFonts.TimesRoman),
    TimesBold: await pdf.embedFont(StandardFonts.TimesRomanBold),
    Courier: await pdf.embedFont(StandardFonts.Courier),
    CourierBold: await pdf.embedFont(StandardFonts.CourierBold),
  };

  for (const pageSpec of spec.pages) {
    const [width, height] = resolveSize(pageSpec.size);
    const page = pdf.addPage([width, height]);

    for (const element of pageSpec.elements) {
      switch (element.type) {
        case "text":
          drawText(page, element, fonts);
          break;
        case "line":
          drawLine(page, element);
          break;
        case "rectangle":
          drawRectangle(page, element);
          break;
        case "table":
          drawTable(page, element, fonts);
          break;
        default:
          throw new Error(`Unsupported element type: ${element.type}`);
      }
    }
  }

  return await pdf.save();
}

async function main() {
  const [specPath, outputPath] = Deno.args;
  if (!specPath || !outputPath) {
    throw new Error("Usage: deno run --allow-read --allow-write deno-generate-scratch.mjs <spec.json> <output.pdf>");
  }

  const specRaw = await Deno.readTextFile(specPath);
  const spec = JSON.parse(specRaw);
  const pdfBytes = await render(spec);

  await Deno.mkdir(dirname(outputPath), { recursive: true });
  await Deno.writeFile(outputPath, pdfBytes);
  console.log(`Created: ${outputPath}`);
}

await main();
