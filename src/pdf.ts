import { PDFDocument, StandardFonts, PDFFont } from "pdf-lib";

export const A4 = { width: 595.28, height: 841.89 }; // points

function htmlToPlainText(html: string): string {
  // Very naive HTML to text: convert common breaks to \n and strip tags
  return html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li)>/gi, "\n")
    .replace(/<li>/gi, "- ")
    .replace(/<[^>]+>/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Store font and sanitize flag per document to be concurrency-safe
const docFonts = new WeakMap<PDFDocument, { font: PDFFont; sanitize: boolean }>();

async function pickFont(pdfDoc: PDFDocument, fontPath?: string): Promise<{ font: PDFFont; sanitize: boolean }> {
  const candidates: string[] = [];
  if (fontPath) candidates.push(fontPath);
  // Try common system fonts if no explicit font was provided
  if (Deno.build.os === "windows") {
    candidates.push("C:\\Windows\\Fonts\\arial.ttf", "C:\\Windows\\Fonts\\segoeui.ttf");
  } else if (Deno.build.os === "darwin") {
    candidates.push(
      "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
      "/Library/Fonts/Arial Unicode.ttf",
      "/Library/Fonts/Arial.ttf",
    );
  } else {
    candidates.push("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf");
  }

  for (const p of candidates) {
    try {
      const bytes = await Deno.readFile(p);
      const font = await pdfDoc.embedFont(bytes, { subset: true });
      return { font, sanitize: false };
    } catch {
      // try next
    }
  }

  // Fallback to WinAnsi + sanitize
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  return { font, sanitize: true };
}

function sanitizeIfNeeded(text: string, sanitize: boolean): string {
  return sanitize ? text.normalize("NFD").replace(/[\u0300-\u036f]/g, "") : text;
}

export async function createPdfDocument(fontPath?: string) {
  const pdfDoc = await PDFDocument.create();
  const picked = await pickFont(pdfDoc, fontPath);
  docFonts.set(pdfDoc, picked);
  return pdfDoc;
}

function wrapText(text: string, maxWidth: number, fontSize: number, font: PDFFont, sanitize: boolean): string[] {
  const out: string[] = [];
  const paragraphs = sanitizeIfNeeded(text, sanitize).split(/\r?\n/);

  for (const para of paragraphs) {
    if (para.trim() === "") {
      out.push(""); // preserve blank line
      continue;
    }
    const words = para.split(/\s+/);
    let line = "";
    for (const w of words) {
      const candidate = line ? `${line} ${w}` : w;
      const width = font.widthOfTextAtSize(candidate, fontSize);
      if (width <= maxWidth) {
        line = candidate;
      } else {
        if (line) out.push(line);
        // Very long single word fallback: hard break if needed
        if (font.widthOfTextAtSize(w, fontSize) > maxWidth) {
          let chunk = "";
          for (const ch of w) {
            const cand = chunk + ch;
            if (font.widthOfTextAtSize(cand, fontSize) <= maxWidth) {
              chunk = cand;
            } else {
              if (chunk) out.push(chunk);
              chunk = ch;
            }
          }
          line = chunk;
        } else {
          line = w;
        }
      }
    }
    if (line) out.push(line);
  }
  return out;
}

export async function renderRecordToPdf(doc: PDFDocument, htmlOrText: string) {
  const picked = docFonts.get(doc);
  if (!picked) throw new Error("Font not initialized for document");
  const { font, sanitize } = picked;

  const margin = 48;
  const fontSize = 12;

  let page = doc.addPage([A4.width, A4.height]);
  let cursorY = A4.height - margin;
  const usableWidth = A4.width - margin * 2;
  const lineHeight = fontSize * 1.35;

  const text = htmlToPlainText(htmlOrText);
  const lines = wrapText(text, usableWidth, fontSize, font, sanitize);

  for (const ln of lines) {
    if (cursorY - lineHeight < margin) {
      page = doc.addPage([A4.width, A4.height]);
      cursorY = A4.height - margin;
    }
    const toDraw = sanitizeIfNeeded(ln, sanitize);
    page.drawText(toDraw, { x: margin, y: cursorY, size: fontSize, font });
    cursorY -= lineHeight;
  }
}

export async function savePdf(doc: PDFDocument, path: string) {
  const bytes = await doc.save();
  await Deno.writeFile(path, bytes);
}