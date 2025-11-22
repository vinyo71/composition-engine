import { ensureDir } from "jsr:@std/fs/ensure-dir";
import { basename, extname, join, dirname, toFileUrl } from "jsr:@std/path";
import { parseXml, findRecords, streamXmlElements } from "../utils/xml.ts";
import { compileTemplate } from "../services/template.ts";
import { createBrowser, closeBrowser, htmlToPdfBytes, findChromeExecutable } from "../services/pdf.ts";
import { Logger } from "../utils/logger.ts";
import { CompositionOptions } from "../types.ts";
import { BrowserPool } from "../services/browser_pool.ts";
import { Semaphore } from "../utils/semaphore.ts";

// Helper to wrap HTML body
function wrapHtmlDoc(body: string, baseUrl: string, extraCss = ""): string {
    return `<!DOCTYPE html><html><head><meta charset="utf-8">
    <base href="${baseUrl}">
    <style>
    @page { size: A4; margin: 20mm 15mm; }
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; }
    .page-break { page-break-after: always; }
    ${extraCss}
  </style></head><body>${body}</body></html>`;
}

function applyOutNamePattern(pattern: string, index: number, record: unknown): string {
    const safeIndex = String(index);
    let out = pattern.replace(/{index}/g, safeIndex);
    if (typeof record === "object" && record !== null) {
        for (const [key, val] of Object.entries(record)) {
            const placeholder = new RegExp(`\\{${key}\\}`, "g");
            out = out.replace(placeholder, String(val ?? ""));
        }
    }
    return out;
}

/**
 * CompositionEngine orchestrates the PDF generation pipeline.
 * Supports both streaming and batch processing modes with browser-based rendering.
 */
export class CompositionEngine {
    private logger: Logger;

    constructor(private opts: CompositionOptions) {
        this.logger = new Logger(opts.logLevel);
    }

    /**
     * Starts the composition process based on the provided options.
     * Supports both streaming and batch processing modes using browser engine.
     */
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

        // Determine base URL for assets
        const templateDir = dirname(this.opts.template);
        // Ensure absolute path for toFileUrl
        const absTemplateDir = await Deno.realPath(templateDir);
        const baseUrl = toFileUrl(absTemplateDir).href + "/";

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
        const setupTime = t_setup_end - t_start;

        // Initialize Browser Pool
        const chromePath = this.opts.chrome || await findChromeExecutable();
        const pool = new BrowserPool(this.opts.concurrency, chromePath, this.opts.logLevel);

        let result = { processed: 0, pages: 0 };
        const t_process_start = performance.now();

        try {
            // Streaming Path
            if (this.opts.streamTag) {
                result = await this.processStream(render, baseUrl, cssContent, headerTpl, footerTpl, pool);
            }
            // Full Load Path
            else {
                result = await this.processBatch(render, baseUrl, cssContent, headerTpl, footerTpl, pool);
            }
        } finally {
            await pool.destroy();
        }

        const t_end = performance.now();
        const processTime = t_end - t_process_start;
        const totalTime = t_end - t_start;
        const pagesPerSec = processTime > 0 ? (result.pages / (processTime / 1000)) : 0;

        if (this.opts.logLevel !== "quiet") {
            this.logger.info("---");
            this.logger.info("Timing Summary");
            this.logger.info(`Setup:      ${setupTime.toFixed(2)} ms`);
            this.logger.info(`Processing: ${processTime.toFixed(2)} ms`);
            this.logger.info(`Total:      ${totalTime.toFixed(2)} ms`);
            this.logger.info(`Total Pages: ${result.pages}`);
            this.logger.info(`Throughput: ${pagesPerSec.toFixed(2)} pages/sec`);
        }
    }

    private async processStream(
        render: (data: any) => string,
        baseUrl: string,
        cssContent: string,
        headerTpl: string | undefined,
        footerTpl: string | undefined,
        pool: BrowserPool
    ): Promise<{ processed: number; pages: number }> {
        const { opts, logger } = this;
        const tag = opts.streamTag!;
        let index = 0;
        let totalPages = 0;

        if (opts.mode === "single") {
            throw new Error("Streaming with --mode=single is not supported.");
        }

        // Implement backpressure with semaphore
        // Allow 2x concurrency in flight to keep pipeline full without unbounded queuing
        const semaphore = new Semaphore(opts.concurrency * 2);
        const inFlight: Promise<void>[] = [];

        for await (const xmlChunk of streamXmlElements(opts.input, tag)) {
            const currentIndex = index++;

            // Acquire semaphore permit before creating task
            await semaphore.acquire();

            const task = (async () => {
                try {
                    const node = parseXml(xmlChunk);
                    const rec = node?.[tag] ?? node;
                    const htmlFrag = render(rec);
                    const full = wrapHtmlDoc(htmlFrag, baseUrl);

                    logger.debug(`Task ${currentIndex}: Acquiring page`);
                    const page = await pool.acquire();
                    logger.debug(`Task ${currentIndex}: Page acquired`);
                    try {
                        const bytes = await htmlToPdfBytes(page, full, cssContent, headerTpl, footerTpl);

                        if (!opts.skipPageCount) {
                            // Import PDFDocument dynamically only for page counting
                            const { PDFDocument } = await import("npm:pdf-lib@^1.17.1");
                            const doc = await PDFDocument.load(bytes);
                            totalPages += doc.getPageCount();
                        }

                        const fileName = applyOutNamePattern(opts.outName, currentIndex, rec);
                        const outPath = join(opts.outDir, fileName);
                        await Deno.writeFile(outPath, bytes);
                        logger.debug(`Task ${currentIndex}: PDF written`);
                    } finally {
                        await pool.release(page);
                        logger.debug(`Task ${currentIndex}: Page released`);
                    }
                } catch (err) {
                    logger.error(`Failed to process record ${currentIndex}:`, err);
                } finally {
                    semaphore.release();
                }
            })();

            inFlight.push(task);

            // Log queue length periodically
            if (currentIndex % 100 === 0) {
                logger.debug(`Queue length: ${semaphore.waitingCount()}`);
            }

            if (opts.limit && index >= opts.limit) break;
        }

        // Wait for all remaining tasks
        await Promise.all(inFlight);
        const count = Math.min(index, opts.limit ?? index);
        logger.info(`Done. Wrote ${count} PDFs to ${opts.outDir}`);
        return { processed: count, pages: totalPages };
    }

    private async processBatch(
        render: (data: any) => string,
        baseUrl: string,
        cssContent: string,
        headerTpl: string | undefined,
        footerTpl: string | undefined,
        pool: BrowserPool
    ): Promise<{ processed: number; pages: number }> {
        const { opts, logger } = this;
        const xmlText = await Deno.readTextFile(opts.input);
        const xmlRoot = parseXml(xmlText);
        const records = findRecords(xmlRoot, opts.recordPath);
        const total = opts.limit ? Math.min(records.length, opts.limit) : records.length;
        let totalPages = 0;

        logger.info(`Records: ${records.length}${opts.limit ? ` (processing ${total})` : ""}`);

        if (opts.mode === "single") {
            const page = await pool.acquire();
            try {
                const parts: string[] = [];
                for (let i = 0; i < total; i++) {
                    const rec = records[i];
                    parts.push(render(rec));
                    if (i < total - 1) parts.push('<div class="page-break"></div>');
                }
                const full = wrapHtmlDoc(parts.join("\n"), baseUrl);
                const bytes = await htmlToPdfBytes(page, full, cssContent, headerTpl, footerTpl);

                // Import PDFDocument dynamically only for page counting
                const { PDFDocument } = await import("npm:pdf-lib@^1.17.1");
                const doc = await PDFDocument.load(bytes);
                totalPages = doc.getPageCount();

                const base = basename(opts.input, extname(opts.input));
                const outPath = join(opts.outDir, `${base}.pdf`);
                await Deno.writeFile(outPath, bytes);
                logger.info(`Wrote single PDF: ${outPath}`);
                return { processed: total, pages: totalPages };
            } finally {
                await pool.release(page);
            }
        } else {
            // Multi mode
            let nextIndex = 0;
            let processed = 0;
            const worker = async (id: number) => {
                while (true) {
                    const i = nextIndex++;
                    if (i >= total) break;

                    const page = await pool.acquire();
                    try {
                        const rec = records[i];
                        const htmlFrag = render(rec);
                        const full = wrapHtmlDoc(htmlFrag, baseUrl);
                        const bytes = await htmlToPdfBytes(page, full, cssContent, headerTpl, footerTpl);

                        if (!opts.skipPageCount) {
                            // Import PDFDocument dynamically only for page counting
                            const { PDFDocument } = await import("npm:pdf-lib@^1.17.1");
                            const doc = await PDFDocument.load(bytes);
                            totalPages += doc.getPageCount();
                        }

                        const fileName = applyOutNamePattern(opts.outName, i, rec);
                        const outPath = join(opts.outDir, fileName);
                        await Deno.writeFile(outPath, bytes);
                        processed++;
                        if ((processed % 100) === 0) logger.info(`Worker ${id}: processed ${processed}/${total}`);
                    } catch (err) {
                        logger.error(`Failed to process record ${i}:`, err);
                    } finally {
                        await pool.release(page);
                    }
                }
            };
            const workers = Array.from({ length: opts.concurrency }, (_, id) => worker(id));
            await Promise.all(workers);
            logger.info(`Done. Wrote ${processed} PDFs to ${opts.outDir}`);
            return { processed, pages: totalPages };
        }
    }
}
