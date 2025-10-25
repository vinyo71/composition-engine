import { parseArgs } from "jsr:@std/cli/parse-args";
import { ensureDir } from "jsr:@std/fs/ensure-dir";
import { basename, extname, join } from "jsr:@std/path";
import { parseXml, findRecords } from "./xml.ts";
import { compileTemplate } from "./template.ts";
import { createPdfDocument, renderRecordToPdf, savePdf, createBrowser, closeBrowser, htmlToPdfBytes } from "./pdf.ts";

type Mode = "multi" | "single";
type Engine = "pdf-lib" | "browser";

type Options = {
  input: string;
  template: string;
  outDir: string;
  outName: string; // pattern with tokens like {index}
  format: "pdf";
  mode: Mode;
  recordPath?: string;
  concurrency: number;
  limit?: number;
  font?: string; // optional path to a TTF/OTF that supports your locale
  streamTag?: string; // repeating element to stream from the XML (e.g., BankStatement)
  engine: Engine;
  chrome?: string; // optional path to Chrome/Chromium/Edge executable
};

function getDefaultOptions(): Options {
  return {
    input: "./inp/bank_statements_1000.xml",
    template: "./templates/statement.html",
    outDir: "./out",
    outName: "{index}.pdf",
    format: "pdf",
    mode: "multi",
    concurrency: Math.max(1, (globalThis as any).navigator?.hardwareConcurrency ?? 4),
    engine: "pdf-lib",
  };
}

function parseCli(): Options {
  const args = parseArgs(Deno.args, {
    alias: {
      i: "input",
      t: "template",
      o: "outDir",
      n: "outName",
      f: "format",
      m: "mode",
      r: "recordPath",
      c: "concurrency",
      l: "limit",
      e: "engine",
    },
    string: ["input", "template", "outDir", "outName", "format", "mode", "recordPath", "font", "streamTag", "engine", "chrome"],
    boolean: [],
  });

  const defaults = getDefaultOptions();
  const opts: Options = {
    input: String(args.input ?? defaults.input),
    template: String(args.template ?? defaults.template),
    outDir: String(args.outDir ?? defaults.outDir),
    outName: String(args.outName ?? defaults.outName),
    format: (args.format ?? defaults.format) as Options["format"],
    mode: (args.mode ?? defaults.mode) as Mode,
    recordPath: args.recordPath ? String(args.recordPath) : undefined,
    concurrency: args.concurrency ? Number(args.concurrency) : defaults.concurrency,
    limit: args.limit ? Number(args.limit) : undefined,
    font: args.font ? String(args.font) : undefined,
    streamTag: args.streamTag ? String(args.streamTag) : undefined,
    engine: (args.engine ?? defaults.engine) as Engine,
    chrome: args.chrome ? String(args.chrome) : undefined,
  };

  if (opts.format !== "pdf") {
    console.error(`Unsupported --format=${opts.format}. Only 'pdf' is supported.`);
    Deno.exit(2);
  }
  if (opts.mode !== "single" && opts.mode !== "multi") {
    console.error(`Unsupported --mode=${opts.mode}. Use 'single' or 'multi'.`);
    Deno.exit(2);
  }
  if (opts.engine !== "pdf-lib" && opts.engine !== "browser") {
    console.error(`Unsupported --engine=${opts.engine}. Use 'pdf-lib' or 'browser'.`);
    Deno.exit(2);
  }
  if (!Number.isFinite(opts.concurrency) || opts.concurrency < 1) {
    console.error(`Invalid --concurrency value.`);
    Deno.exit(2);
  }
  return opts;
}

// Build a full HTML doc from body content, with basic print CSS
function wrapHtmlDoc(body: string, extraCss = ""): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    @page { size: A4; margin: 20mm 15mm; }
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; }
    .page-break { page-break-after: always; }
    ${extraCss}
  </style></head><body>${body}</body></html>`;
}

// Stream <tagName>...</tagName> blocks from a large XML file without loading it fully
async function* streamXmlElements(filePath: string, tagName: string): AsyncGenerator<string> {
  const file = await Deno.open(filePath, { read: true });
  try {
    const reader = file.readable.pipeThrough(new TextDecoderStream()).getReader();
    let buf = "";
    const startNeedle = `<${tagName}`;
    const endNeedle = `</${tagName}>`;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += value ?? "";

      while (true) {
        const start = buf.indexOf(startNeedle);
        if (start === -1) {
          // Keep a small tail in case a start tag spans chunks
          buf = buf.slice(-Math.max(startNeedle.length, 64));
          break;
        }
        const startTagEnd = buf.indexOf(">", start);
        if (startTagEnd === -1) {
          // Need more data to finish start tag
          break;
        }
        const end = buf.indexOf(endNeedle, startTagEnd + 1);
        if (end === -1) {
          // Need more data for end tag
          // Keep from start to end to avoid losing partial element
          buf = buf.slice(start);
          break;
        }
        const endClose = end + endNeedle.length;
        const elementXml = buf.slice(start, endClose);
        yield elementXml;
        buf = buf.slice(endClose);
      }
    }
  } finally {
    file.close();
  }
}

function applyOutNamePattern(pattern: string, index: number, record: unknown): string {
  const safeIndex = String(index);
  let name = pattern.replaceAll("{index}", safeIndex);
  // Optional: derive an id if present
  const id = (record as any)?.id ?? (record as any)?.Id ?? (record as any)?.ID ?? null;
  if (id != null) {
    name = name.replaceAll("{id}", String(id));
  }
  if (!extname(name)) name += ".pdf";
  return name;
}

async function main() {
  const opts = parseCli();
  await ensureDir(opts.outDir);

  // Load template only (avoid loading huge XML into memory)
  const templateText = await Deno.readTextFile(opts.template);
  const render = compileTemplate(templateText);

  // Streaming path for huge XMLs
  if (opts.streamTag) {
    const tag = opts.streamTag;
    let processed = 0;

    // Browser engine streaming (multi only)
    if (opts.engine === "browser") {
      if (opts.mode === "single") {
        console.error("Streaming + --engine=browser with --mode=single is not supported. Use --mode=multi or remove --streamTag.");
        Deno.exit(2);
      }
      const browser = await createBrowser(opts.chrome);
      try {
        const batch: Promise<void>[] = [];
        let index = 0;
        for await (const xmlChunk of streamXmlElements(opts.input, tag)) {
          const currentIndex = index++;
          const task = (async () => {
            const node = parseXml(xmlChunk);
            const rec = node?.[tag] ?? node;
            const htmlFrag = render(rec);
            const full = wrapHtmlDoc(htmlFrag);
            const bytes = await htmlToPdfBytes(browser, full);
            const fileName = applyOutNamePattern(opts.outName, currentIndex, rec);
            const outPath = join(opts.outDir, fileName);
            await Deno.writeFile(outPath, bytes);
          })();
          batch.push(task);
          if (batch.length >= opts.concurrency) {
            await Promise.all(batch);
            batch.length = 0;
            console.log(`Processed ${currentIndex + 1}`);
          }
          if (opts.limit && index >= opts.limit) break;
        }
        if (batch.length) await Promise.all(batch);
        console.log(`Done. Wrote ${Math.min(index, opts.limit ?? index)} PDFs to ${opts.outDir}`);
        return;
      } finally {
        await closeBrowser(browser);
      }
    }

    // pdf-lib engine streaming (supports single and multi)
    if (opts.mode === "single") {
      const doc = await createPdfDocument(opts.font);
      for await (const xmlChunk of streamXmlElements(opts.input, tag)) {
        const node = parseXml(xmlChunk);
        const rec = node?.[tag] ?? node;
        const html = render(rec);
        await renderRecordToPdf(doc, html);
        processed++;
        if (opts.limit && processed >= opts.limit) break;
        if ((processed % 1000) === 0) console.log(`Processed ${processed}`);
      }
      const base = basename(opts.input, extname(opts.input));
      const outPath = join(opts.outDir, `${base}.pdf`);
      await savePdf(doc, outPath);
      console.log(`Wrote single PDF: ${outPath}`);
      return;
    }

    const batch: Promise<void>[] = [];
    let index = 0;
    for await (const xmlChunk of streamXmlElements(opts.input, tag)) {
      const currentIndex = index++;
      const task = (async () => {
        const node = parseXml(xmlChunk);
        const rec = node?.[tag] ?? node;
        const html = render(rec);
        const doc = await createPdfDocument(opts.font);
        await renderRecordToPdf(doc, html);
        const fileName = applyOutNamePattern(opts.outName, currentIndex, rec);
        const outPath = join(opts.outDir, fileName);
        await savePdf(doc, outPath);
      })();
      batch.push(task);
      if (batch.length >= opts.concurrency) {
        await Promise.all(batch);
        batch.length = 0;
        console.log(`Processed ${currentIndex + 1}`);
      }
      if (opts.limit && index >= opts.limit) break;
    }
    if (batch.length) await Promise.all(batch);
    console.log(`Done. Wrote ${Math.min(index, opts.limit ?? index)} PDFs to ${opts.outDir}`);
    return;
  }

  // Fallback: small/medium XMLs (existing behavior)
  const [xmlText] = await Promise.all([
    Deno.readTextFile(opts.input),
  ]);

  const xmlRoot = parseXml(xmlText);
  const records = findRecords(xmlRoot, opts.recordPath);
  const total = opts.limit ? Math.min(records.length, opts.limit) : records.length;

  console.log(`Records: ${records.length}${opts.limit ? ` (processing ${total})` : ""}`);

  // Browser engine (HTML+CSS)
  if (opts.engine === "browser") {
    if (opts.mode === "single") {
      const parts: string[] = [];
      for (let i = 0; i < total; i++) {
        const rec = records[i];
        parts.push(render(rec));
        if (i < total - 1) parts.push('<div class="page-break"></div>');
      }
      const full = wrapHtmlDoc(parts.join("\n"));
      const browser = await createBrowser(opts.chrome);
      try {
        const bytes = await htmlToPdfBytes(browser, full);
        const base = basename(opts.input, extname(opts.input));
        const outPath = join(opts.outDir, `${base}.pdf`);
        await Deno.writeFile(outPath, bytes);
        console.log(`Wrote single PDF: ${outPath}`);
      } finally {
        await closeBrowser(browser);
      }
      return;
    }

    // mode=multi with browser: concurrent pages
    const browser = await createBrowser(opts.chrome);
    try {
      let nextIndex = 0;
      let processed = 0;
      async function worker(id: number) {
        while (true) {
          const i = nextIndex++;
          if (i >= total) break;
          const rec = records[i];
          const htmlFrag = render(rec);
          const full = wrapHtmlDoc(htmlFrag);
          const bytes = await htmlToPdfBytes(browser, full);
          const fileName = applyOutNamePattern(opts.outName, i, rec);
          const outPath = join(opts.outDir, fileName);
          await Deno.writeFile(outPath, bytes);
          processed++;
          if ((processed % 100) === 0) console.log(`Worker ${id}: processed ${processed}/${total}`);
        }
      }
      const workers = Array.from({ length: opts.concurrency }, (_, id) => worker(id));
      await Promise.all(workers);
      console.log(`Done. Wrote ${processed} PDFs to ${opts.outDir}`);
      return;
    } finally {
      await closeBrowser(browser);
    }
  }

  // pdf-lib engine (existing behavior)
  if (opts.mode === "single") {
    // Single combined PDF
    const doc = await createPdfDocument(opts.font);
    let processed = 0;
    for (let i = 0; i < total; i++) {
      const rec = records[i];
      const html = render(rec);
      await renderRecordToPdf(doc, html);
      processed++;
      if ((processed % 1000) === 0) console.log(`Processed ${processed}/${total}`);
    }
    const base = basename(opts.input, extname(opts.input));
    const outPath = join(opts.outDir, `${base}.pdf`);
    await savePdf(doc, outPath);
    console.log(`Wrote single PDF: ${outPath}`);
    return;
  }

  // Multi: one PDF per record (concurrent)
  const concurrency = opts.concurrency;
  let nextIndex = 0;
  let processed = 0;
  async function worker(id: number) {
    while (true) {
      const i = nextIndex++;
      if (i >= total) break;
      const rec = records[i];
      const html = render(rec);
      const doc = await createPdfDocument(opts.font);
      await renderRecordToPdf(doc, html);
      const fileName = applyOutNamePattern(opts.outName, i, rec);
      const outPath = join(opts.outDir, fileName);
      await savePdf(doc, outPath);
      processed++;
      if ((processed % 1000) === 0) {
        console.log(`Worker ${id}: processed ${processed}/${total}`);
      }
    }
  }
  const workers = Array.from({ length: concurrency }, (_, id) => worker(id));
  await Promise.all(workers);
  console.log(`Done. Wrote ${processed} PDFs to ${opts.outDir}`);
}

if (import.meta.main) {
  // deno run -A src/cli.ts --input data.xml --template templates/statement.html --outDir out --mode multi
  main().catch((err) => {
    console.error(err);
    Deno.exit(1);
  });
}