import { parseArgs } from "jsr:@std/cli/parse-args";
import { ensureDir } from "jsr:@std/fs/ensure-dir";
import { basename, extname, join } from "jsr:@std/path";
import { parseXml, findRecords } from "./xml.ts";
import { compileTemplate } from "./template.ts";
import { createPdfDocument, renderRecordToPdf, savePdf, createBrowser, closeBrowser, htmlToPdfBytes } from "./pdf.ts";

type Mode = "multi" | "single";
type Engine = "pdf-lib" | "browser";
type LogLevel = "quiet" | "info" | "debug";

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
  css?: string; // optional path to a CSS file to inject into the HTML
  logLevel: LogLevel;
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
    engine: "browser",
    logLevel: "info",
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
      ll: "logLevel",
    },
    string: ["input", "template", "outDir", "outName", "format", "mode", "recordPath", "font", "streamTag", "engine", "chrome", "css", "logLevel"],
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
    css: args.css ? String(args.css) : undefined,
    logLevel: (args.logLevel ?? defaults.logLevel) as LogLevel,
  };

  if (opts.format !== "pdf") {
    logger.error(`Unsupported --format=${opts.format}. Only 'pdf' is supported.`);
    Deno.exit(2);
  }
  if (opts.mode !== "single" && opts.mode !== "multi") {
    logger.error(`Unsupported --mode=${opts.mode}. Use 'single' or 'multi'.`);
    Deno.exit(2);
  }
  if (opts.engine !== "pdf-lib" && opts.engine !== "browser") {
    logger.error(`Unsupported --engine=${opts.engine}. Use 'pdf-lib' or 'browser'.`);
    Deno.exit(2);
  }
  if (opts.logLevel !== "quiet" && opts.logLevel !== "info" && opts.logLevel !== "debug") {
    logger.error(`Unsupported --logLevel=${opts.logLevel}. Use 'quiet', 'info', or 'debug'.`);
    Deno.exit(2);
  }
  if (opts.engine === "pdf-lib") {
    logger.warn("Warning: --engine=pdf-lib is deprecated and will be removed in a future version. The default is now 'browser'.");
  }
  if (!Number.isFinite(opts.concurrency) || opts.concurrency < 1) {
    logger.error(`Invalid --concurrency value.`);
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

// --- Logger ---
const LOG_LEVELS: Record<LogLevel, number> = { quiet: 0, info: 1, debug: 2 };
let logger: Logger;

class Logger {
  level: number;
  constructor(logLevel: LogLevel) {
    this.level = LOG_LEVELS[logLevel];
  }
  info(...args: any[]) {
    if (this.level >= LOG_LEVELS.info) console.log(...args);
  }
  warn(...args: any[]) {
    if (this.level >= LOG_LEVELS.info) console.warn(...args);
  }
  debug(...args: any[]) {
    if (this.level >= LOG_LEVELS.debug) console.debug(...args);
  }
  error(...args: any[]) {
    console.error(...args);
  }
}

async function main() {
  const t_start = performance.now();
  const opts = parseCli();
  logger = new Logger(opts.logLevel);

  await ensureDir(opts.outDir);

  let cssContent = "";
  if (opts.css) {
    cssContent = await Deno.readTextFile(opts.css);
  }

  // Load template only (avoid loading huge XML into memory)
  const templateText = await Deno.readTextFile(opts.template);
  const render = compileTemplate(templateText);
  const t_setup_end = performance.now();

  let total = 0;

  // Streaming path for huge XMLs
  if (opts.streamTag) {
    const tag = opts.streamTag;
    let processed = 0;

    // Browser engine streaming (multi only)
    if (opts.engine === "browser") {
      if (opts.mode === "single") {
        logger.error("Streaming + --engine=browser with --mode=single is not supported. Use --mode=multi or remove --streamTag.");
        Deno.exit(2);
      }
      const browser = await createBrowser(opts.chrome);
      try {
        const batch: Promise<void>[] = [];
        let index = 0;
        for await (const xmlChunk of streamXmlElements(opts.input, tag)) {
          const currentIndex = index++;
          total++;
          const task = (async () => {
            const node = parseXml(xmlChunk);
            const rec = node?.[tag] ?? node;
            const htmlFrag = render(rec);
            const full = wrapHtmlDoc(htmlFrag);
            const page = await browser.newPage();
            try {
              const bytes = await htmlToPdfBytes(page, full, cssContent);
              const fileName = applyOutNamePattern(opts.outName, currentIndex, rec);
              const outPath = join(opts.outDir, fileName);
              await Deno.writeFile(outPath, bytes);
            } finally {
              await page.close();
            }
          })();
          batch.push(task);
          if (batch.length >= opts.concurrency) {
            await Promise.all(batch);
            batch.length = 0;
            logger.info(`Processed ${currentIndex + 1}`);
          }
          if (opts.limit && index >= opts.limit) break;
        }
        if (batch.length) await Promise.all(batch);
        logger.info(`Done. Wrote ${Math.min(index, opts.limit ?? index)} PDFs to ${opts.outDir}`);
      } finally {
        await closeBrowser(browser);
      }
    }

    // pdf-lib engine streaming (supports single and multi)
    else if (opts.mode === "single") {
      const doc = await createPdfDocument(opts.font);
      for await (const xmlChunk of streamXmlElements(opts.input, tag)) {
        total++;
        const node = parseXml(xmlChunk);
        const rec = node?.[tag] ?? node;
        const html = render(rec);
        await renderRecordToPdf(doc, html);
        processed++;
        if (opts.limit && processed >= opts.limit) break;
        if ((processed % 1000) === 0) logger.info(`Processed ${processed}`);
      }
      const base = basename(opts.input, extname(opts.input));
      const outPath = join(opts.outDir, `${base}.pdf`);
      await savePdf(doc, outPath);
      logger.info(`Wrote single PDF: ${outPath}`);
    } else {
      const batch: Promise<void>[] = [];
      let index = 0;
      for await (const xmlChunk of streamXmlElements(opts.input, tag)) {
        total++;
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
          logger.info(`Processed ${currentIndex + 1}`);
        }
        if (opts.limit && index >= opts.limit) break;
      }
      if (batch.length) await Promise.all(batch);
      logger.info(`Done. Wrote ${Math.min(index, opts.limit ?? index)} PDFs to ${opts.outDir}`);
    }
    const t_render_write_end = performance.now();
    const setupTime = t_setup_end - t_start;
    const processTime = t_render_write_end - t_setup_end;
    const totalTime = t_render_write_end - t_start;
    if (opts.logLevel !== "quiet") {
      logger.info("---");
      logger.info("Timing Summary (Streaming)");
      logger.info(`Setup:      ${setupTime.toFixed(2)} ms`);
      logger.info(`Processing: ${processTime.toFixed(2)} ms`);
      logger.info(`Total:      ${totalTime.toFixed(2)} ms`);
      if (total > 0) {
        logger.info(`Throughput: ${(total / (totalTime / 1000)).toFixed(2)} rec/s`);
      }
    }
    return;
  }

  // Fallback: small/medium XMLs (existing behavior)
  const xmlText = await Deno.readTextFile(opts.input);
  const t_load_end = performance.now();

  const xmlRoot = parseXml(xmlText);
  const records = findRecords(xmlRoot, opts.recordPath);
  total = opts.limit ? Math.min(records.length, opts.limit) : records.length;
  const t_parse_end = performance.now();

  logger.info(`Records: ${records.length}${opts.limit ? ` (processing ${total})` : ""}`);

  // Browser engine (HTML+CSS)
  if (opts.engine === "browser") {
    if (opts.mode === "single") {
      const browser = await createBrowser(opts.chrome);
      try {
        const parts: string[] = [];
        for (let i = 0; i < total; i++) {
          const rec = records[i];
          parts.push(render(rec));
          if (i < total - 1) parts.push('<div class="page-break"></div>');
        }
        const full = wrapHtmlDoc(parts.join("\n"));
        const bytes = await htmlToPdfBytes(browser, full, cssContent);
        const base = basename(opts.input, extname(opts.input));
        const outPath = join(opts.outDir, `${base}.pdf`);
        await Deno.writeFile(outPath, bytes);
        logger.info(`Wrote single PDF: ${outPath}`);
      } finally {
        await closeBrowser(browser);
      }
    } else { // mode=multi
      let nextIndex = 0;
      let processed = 0;
      async function worker(id: number) {
        const browser = await createBrowser(opts.chrome);
        try {
          while (true) {
            const i = nextIndex++;
            if (i >= total) break;
            try {
              const rec = records[i];
              const htmlFrag = render(rec);
              const full = wrapHtmlDoc(htmlFrag);
              const bytes = await htmlToPdfBytes(browser, full, cssContent);
              const fileName = applyOutNamePattern(opts.outName, i, rec);
              const outPath = join(opts.outDir, fileName);
              await Deno.writeFile(outPath, bytes);
              processed++;
              if ((processed % 100) === 0) logger.info(`Worker ${id}: processed ${processed}/${total}`);
            } catch (err) {
              logger.error(`Failed to process record ${i}:`, err);
            }
          }
        } finally {
          await closeBrowser(browser);
        }
      }
      const workers = Array.from({ length: opts.concurrency }, (_, id) => worker(id));
      const results = await Promise.allSettled(workers);
      results.forEach(result => {
        if (result.status === 'rejected') {
          logger.error(result.reason);
        }
      });
      logger.info(`Done. Wrote ${processed} PDFs to ${opts.outDir}`);
    }
  }

  // pdf-lib engine (existing behavior)
  else if (opts.mode === "single") {
    const doc = await createPdfDocument(opts.font);
    let processed = 0;
    for (let i = 0; i < total; i++) {
      const rec = records[i];
      const html = render(rec);
      await renderRecordToPdf(doc, html);
      processed++;
      if ((processed % 1000) === 0) logger.info(`Processed ${processed}/${total}`);
    }
    const base = basename(opts.input, extname(opts.input));
    const outPath = join(opts.outDir, `${base}.pdf`);
    await savePdf(doc, outPath);
    logger.info(`Wrote single PDF: ${outPath}`);
  } else { // mode=multi
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
          logger.info(`Worker ${id}: processed ${processed}/${total}`);
        }
      }
    }
    const workers = Array.from({ length: opts.concurrency }, (_, id) => worker(id));
    await Promise.all(workers);
    logger.info(`Done. Wrote ${processed} PDFs to ${opts.outDir}`);
  }

  const t_render_write_end = performance.now();
  const setupTime = t_setup_end - t_start;
  const loadTime = t_load_end - t_load_end;
  const parseTime = t_parse_end - t_load_end;
  const processTime = t_render_write_end - t_parse_end;
  const totalTime = t_render_write_end - t_start;

  if (opts.logLevel !== "quiet") {
    logger.info("---");
    logger.info("Timing Summary");
    logger.info(`Setup:      ${setupTime.toFixed(2)} ms`);
    logger.info(`Load XML:   ${loadTime.toFixed(2)} ms`);
    logger.info(`Parse XML:  ${parseTime.toFixed(2)} ms`);
    logger.info(`Processing: ${processTime.toFixed(2)} ms`);
    logger.info(`Total:      ${totalTime.toFixed(2)} ms`);
    if (total > 0) {
      logger.info(`Throughput: ${(total / (totalTime / 1000)).toFixed(2)} rec/s`);
    }
  }
}

if (import.meta.main) {
  // deno run -A src/cli.ts --input data.xml --template templates/statement.html --outDir out --mode multi
  main().catch((err) => {
    logger.error(err);
    Deno.exit(1);
  });
}