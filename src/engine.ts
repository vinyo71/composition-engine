import { ensureDir } from "jsr:@std/fs/ensure-dir";
import { basename, extname, join } from "jsr:@std/path";
import { parseXml, findRecords, streamXmlElements } from "./xml.ts";
import { compileTemplate } from "./template.ts";
import { createPdfDocument, renderRecordToPdf, savePdf, createBrowser, closeBrowser, htmlToPdfBytes, findChromeExecutable } from "./pdf.ts";
import { Logger } from "./logger.ts";
import { CompositionOptions } from "./types.ts";
import { BrowserPool } from "./browser_pool.ts";

// Helper to wrap HTML body
function wrapHtmlDoc(body: string, extraCss = ""): string {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    @page { size: A4; margin: 20mm 15mm; }
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; }
    .page-break { page-break-after: always; }
    ${extraCss}
  </style></head><body>${body}</body></html>`;
}

function applyOutNamePattern(pattern: string, index: number, record: unknown): string {
    const safeIndex = String(index);
    let name = pattern.replaceAll("{index}", safeIndex);
    const id = (record as any)?.id ?? (record as any)?.Id ?? (record as any)?.ID ?? null;
    if (id != null) {
        name = name.replaceAll("{id}", String(id));
    }
    if (!extname(name)) name += ".pdf";
    return name;
}

export class CompositionEngine {
    private logger: Logger;

    constructor(private opts: CompositionOptions) {
        this.logger = new Logger(opts.logLevel);
    }

    async process() {
        const t_start = performance.now();
        await ensureDir(this.opts.outDir);

        let cssContent = "";
        if (this.opts.css) {
            cssContent = await Deno.readTextFile(this.opts.css);
        }

        // Load template
        const templateText = await Deno.readTextFile(this.opts.template);
        const render = compileTemplate(templateText);

        // Load header/footer if present
        let headerTpl: string | undefined;
        let footerTpl: string | undefined;
        if (this.opts.headerTemplate) {
            headerTpl = await Deno.readTextFile(this.opts.headerTemplate);
        }
        if (this.opts.footerTemplate) {
            footerTpl = await Deno.readTextFile(this.opts.footerTemplate);
        }

        const t_setup_end = performance.now();

        // Initialize Browser Pool if needed
        let pool: BrowserPool | undefined;
        if (this.opts.engine === "browser") {
            const chromePath = this.opts.chrome || await findChromeExecutable();
            // Limit pool size to concurrency to avoid overloading
            pool = new BrowserPool(this.opts.concurrency, chromePath, this.opts.logLevel);
        }

        try {
            // Streaming Path
            if (this.opts.streamTag) {
                await this.processStream(render, cssContent, headerTpl, footerTpl, pool);
            }
            // Full Load Path
            else {
                await this.processBatch(render, cssContent, headerTpl, footerTpl, pool);
            }
        } finally {
            if (pool) await pool.destroy();
        }

        const t_end = performance.now();
        const totalTime = t_end - t_start;

        if (this.opts.logLevel !== "quiet") {
            this.logger.info("---");
            this.logger.info("Timing Summary");
            this.logger.info(`Total:      ${totalTime.toFixed(2)} ms`);
        }
    }

    private async processStream(
        render: (data: any) => string,
        cssContent: string,
        headerTpl: string | undefined,
        footerTpl: string | undefined,
        pool?: BrowserPool
    ) {
        const { opts, logger } = this;
        const tag = opts.streamTag!;
        let index = 0;

        // Browser Engine (Multi Only)
        if (opts.engine === "browser" && pool) {
            if (opts.mode === "single") {
                throw new Error("Streaming + --engine=browser with --mode=single is not supported.");
            }

            const batch: Promise<void>[] = [];
            for await (const xmlChunk of streamXmlElements(opts.input, tag)) {
                const currentIndex = index++;
                const task = (async () => {
                    const node = parseXml(xmlChunk);
                    const rec = node?.[tag] ?? node;
                    const htmlFrag = render(rec);
                    const full = wrapHtmlDoc(htmlFrag);

                    const browser = await pool.acquire();
                    try {
                        const bytes = await htmlToPdfBytes(browser as any, full, cssContent, headerTpl, footerTpl);
                        const fileName = applyOutNamePattern(opts.outName, currentIndex, rec);
                        const outPath = join(opts.outDir, fileName);
                        await Deno.writeFile(outPath, bytes);
                    } finally {
                        pool.release(browser);
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
        }
        // PDF-Lib Engine
        else {
            if (opts.mode === "single") {
                const doc = await createPdfDocument(opts.font);
                let processed = 0;
                for await (const xmlChunk of streamXmlElements(opts.input, tag)) {
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
                // Multi
                const batch: Promise<void>[] = [];
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
                        logger.info(`Processed ${currentIndex + 1}`);
                    }
                    if (opts.limit && index >= opts.limit) break;
                }
                if (batch.length) await Promise.all(batch);
                logger.info(`Done. Wrote ${Math.min(index, opts.limit ?? index)} PDFs to ${opts.outDir}`);
            }
        }
    }

    private async processBatch(
        render: (data: any) => string,
        cssContent: string,
        headerTpl: string | undefined,
        footerTpl: string | undefined,
        pool?: BrowserPool
    ) {
        const { opts, logger } = this;
        const xmlText = await Deno.readTextFile(opts.input);
        const xmlRoot = parseXml(xmlText);
        const records = findRecords(xmlRoot, opts.recordPath);
        const total = opts.limit ? Math.min(records.length, opts.limit) : records.length;

        logger.info(`Records: ${records.length}${opts.limit ? ` (processing ${total})` : ""}`);

        if (opts.engine === "browser" && pool) {
            if (opts.mode === "single") {
                const browser = await pool.acquire();
                try {
                    const parts: string[] = [];
                    for (let i = 0; i < total; i++) {
                        const rec = records[i];
                        parts.push(render(rec));
                        if (i < total - 1) parts.push('<div class="page-break"></div>');
                    }
                    const full = wrapHtmlDoc(parts.join("\n"));
                    const bytes = await htmlToPdfBytes(browser as any, full, cssContent, headerTpl, footerTpl);
                    const base = basename(opts.input, extname(opts.input));
                    const outPath = join(opts.outDir, `${base}.pdf`);
                    await Deno.writeFile(outPath, bytes);
                    logger.info(`Wrote single PDF: ${outPath}`);
                } finally {
                    pool.release(browser);
                }
            } else {
                let nextIndex = 0;
                let processed = 0;
                const worker = async (id: number) => {
                    while (true) {
                        const i = nextIndex++;
                        if (i >= total) break;

                        const browser = await pool!.acquire();
                        try {
                            const rec = records[i];
                            const htmlFrag = render(rec);
                            const full = wrapHtmlDoc(htmlFrag);
                            const bytes = await htmlToPdfBytes(browser as any, full, cssContent, headerTpl, footerTpl);
                            const fileName = applyOutNamePattern(opts.outName, i, rec);
                            const outPath = join(opts.outDir, fileName);
                            await Deno.writeFile(outPath, bytes);
                            processed++;
                            if ((processed % 100) === 0) logger.info(`Worker ${id}: processed ${processed}/${total}`);
                        } catch (err) {
                            logger.error(`Failed to process record ${i}:`, err);
                        } finally {
                            pool!.release(browser);
                        }
                    }
                };
                const workers = Array.from({ length: opts.concurrency }, (_, id) => worker(id));
                await Promise.all(workers);
                logger.info(`Done. Wrote ${processed} PDFs to ${opts.outDir}`);
            }
        } else {
            // pdf-lib (unchanged)
            if (opts.mode === "single") {
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
            } else {
                let nextIndex = 0;
                let processed = 0;
                const worker = async (id: number) => {
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
                };
                const workers = Array.from({ length: opts.concurrency }, (_, id) => worker(id));
                await Promise.all(workers);
                logger.info(`Done. Wrote ${processed} PDFs to ${opts.outDir}`);
            }
        }
    }
}
