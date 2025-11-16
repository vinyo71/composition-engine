import { PDFDocument, StandardFonts, PDFFont } from "pdf-lib";
import puppeteer from "puppeteer";

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

// Chromium (Puppeteer) HTML+CSS rendering helpers
export type PuppeteerBrowser = any;

async function exists(p: string): Promise<boolean> {
  try { await Deno.stat(p); return true; } catch { return false; }
}

async function findChromeExecutable(): Promise<string | undefined> {
  const envPath = Deno.env.get("PUPPETEER_EXECUTABLE_PATH");
  if (envPath && await exists(envPath)) return envPath;

  if (Deno.build.os === "windows") {
    const candidates = [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      `${Deno.env.get("LOCALAPPDATA") ?? "C:\\Users\\%USERNAME%\\AppData\\Local"}\\Google\\Chrome\\Application\\chrome.exe`,
      "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
      "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    ];
    for (const p of candidates) if (await exists(p)) return p;
  } else if (Deno.build.os === "darwin") {
    const candidates = [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      `${Deno.env.get("HOME") ?? ""}/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`,
    ];
    for (const p of candidates) if (await exists(p)) return p;
  } else {
    const candidates = [
      "/usr/bin/google-chrome",
      "/usr/bin/google-chrome-stable",
      "/usr/bin/chromium",
      "/usr/bin/chromium-browser",
      "/snap/bin/chromium",
    ];
    for (const p of candidates) if (await exists(p)) return p;
  }
  return undefined;
}

export async function createBrowser(executablePath?: string): Promise<PuppeteerBrowser> {
  const exe = executablePath || await findChromeExecutable();
  const browser = await puppeteer.launch(
    exe ? { headless: "new" as any, executablePath: exe } : { headless: "new" as any },
  );
  return browser;
}

export async function closeBrowser(browser: PuppeteerBrowser) {
  try {
    await browser?.close();
  } catch {
    // ignore
  }
}

export async function htmlToPdfBytes(browser: PuppeteerBrowser, fullHtml: string, cssContent = ""): Promise<Uint8Array> {
  const page = await browser.newPage();
  try {
    await page.setContent(fullHtml, { waitUntil: "networkidle0" });
    if (cssContent) {
      await page.addStyleTag({ content: cssContent });
    }
    const buf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", right: "15mm", bottom: "20mm", left: "15mm" },
    });
    return buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  } finally {
    await page.close();
  }
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