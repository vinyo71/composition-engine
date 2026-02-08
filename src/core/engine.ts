import { ensureDir } from "jsr:@std/fs/ensure-dir";
import { basename, extname, join, dirname, toFileUrl } from "jsr:@std/path";
import { parseXml, findRecords, streamXmlElements } from "../utils/xml.ts";
import { parseJsonInput, findJsonRecords } from "../utils/json_parser.ts";
import { compileTemplate } from "../services/template.ts";
import { createBrowser, closeBrowser, htmlToPdfBytes, findChromeExecutable, getAssetCacheStats } from "../services/pdf.ts";
import { Logger } from "../utils/logger.ts";
import { CompositionOptions } from "../types.ts";
import { BrowserPool } from "../services/browser_pool.ts";
import { Semaphore } from "../utils/semaphore.ts";
import { ProgressBar } from "../utils/progress.ts";
import { countPdfPages } from "../utils/pdf_page_counter.ts";

// Cached pdf-lib import for single-mode (needs full PDF merge capabilities)


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

        // Initialize Browser Pool with pre-warming
        const chromePath = this.opts.chrome || await findChromeExecutable();
        const pool = new BrowserPool(this.opts.concurrency, chromePath, this.opts.logLevel);
        await pool.initialize(); // Pre-warm pages for faster first record

        // Dry-run mode: validate template and data, then exit
        if (this.opts.dryRun) {
            const ext = extname(this.opts.input).toLowerCase();
            const content = await Deno.readTextFile(this.opts.input);
            let recordCount: number;

            if (ext === ".json") {
                const records = parseJsonInput(content);
                recordCount = this.opts.limit ? Math.min(records.length, this.opts.limit) : records.length;
            } else {
                const xmlRoot = parseXml(content);
                const records = findRecords(xmlRoot, this.opts.recordPath);
                recordCount = this.opts.limit ? Math.min(records.length, this.opts.limit) : records.length;
            }

            const t_end = performance.now();
            this.logger.info("[DRY RUN] Validation complete");
            this.logger.info(`  Input:     ${this.opts.input}`);
            this.logger.info(`  Template:  ${this.opts.template}`);
            this.logger.info(`  Records:   ${recordCount}`);
            this.logger.info(`  Time:      ${((t_end - t_start) / 1000).toFixed(2)}s`);
            await pool.destroy();
            return;
        }

        let result = { processed: 0, pages: 0, totalBytes: 0, failed: 0, errors: [] as string[] };
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
            this.logger.debug("Destroying browser pool...");
            await pool.destroy();
        }

        const t_end = performance.now();
        const processTime = t_end - t_process_start;
        const totalTime = t_end - t_start;

        this.printJobSummary(result, setupTime, processTime, totalTime);
    }

    private printJobSummary(
        result: { processed: number; pages: number; totalBytes: number; failed: number; errors: string[] },
        setupTime: number,
        processTime: number,
        totalTime: number
    ) {
        const { opts, logger } = this;
        const pdfsPerSec = processTime > 0 ? (result.processed / (processTime / 1000)) : 0;
        const pagesPerSec = result.pages > 0 ? (result.pages / (processTime / 1000)) : 0;
        const msPerPdf = result.processed > 0 ? (processTime / result.processed) : 0;
        const cacheStats = getAssetCacheStats();
        const inputBasename = opts.input.split(/[/\\]/).pop() || opts.input;

        const formatBytes = (bytes: number): string => {
            if (bytes < 1024) return `${bytes} B`;
            if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
            return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
        };

        // JSON output mode
        if (opts.jsonOutput) {
            const status = result.failed > 0 ? (result.processed > 0 ? "warning" : "error") : "success";
            const jsonResult = {
                status,
                input: opts.input,
                output: opts.outDir,
                processed: result.processed,
                failed: result.failed,
                pages: result.pages,
                totalBytes: result.totalBytes,
                timeMs: Math.round(totalTime),
                pdfsPerSec: Math.round(pdfsPerSec * 100) / 100,
                pagesPerSec: Math.round(pagesPerSec * 100) / 100,
                errors: result.errors,
            };
            console.log(JSON.stringify(jsonResult, null, 2));
            return;
        }

        // Quiet mode - no output
        if (opts.logLevel === "quiet") {
            return;
        }

        // Determine status
        const status = result.failed > 0
            ? (result.processed > 0 ? "[WARN] Completed with errors" : "[ERR] Failed")
            : "[OK] Completed";

        logger.info("");
        logger.info(status);
        logger.info(`  Input:       ${inputBasename} (${result.processed + result.failed} records)`);
        logger.info(`  Output:      ${opts.outDir}`);

        if (result.failed > 0) {
            logger.info(`  Success:     ${result.processed}/${result.processed + result.failed} (${result.failed} failed)`);
        } else {
            logger.info(`  PDFs:        ${result.processed}`);
        }

        if (!opts.skipPageCount && result.pages > 0) {
            const avgPages = (result.pages / result.processed).toFixed(1);
            logger.info(`  Pages:       ${result.pages} (${avgPages} avg)`);
            logger.info(`  Throughput:  ${pdfsPerSec.toFixed(2)} PDFs/sec | ${pagesPerSec.toFixed(2)} pages/sec`);
        } else {
            logger.info(`  Throughput:  ${pdfsPerSec.toFixed(2)} PDFs/sec`);
        }

        if (result.totalBytes > 0) {
            const avgSize = result.totalBytes / result.processed;
            logger.info(`  Size:        ${formatBytes(result.totalBytes)} (${formatBytes(avgSize)} avg)`);
        }

        logger.info(`  Time:        ${(totalTime / 1000).toFixed(2)}s (${msPerPdf.toFixed(0)}ms/PDF)`);

        // Verbose mode - show extra details
        if (opts.verbose) {
            logger.info("");
            logger.info("  Details:");
            logger.info(`    Concurrency:  ${opts.concurrency}`);
            logger.info(`    Mode:         ${opts.streamTag ? "streaming" : "batch"}`);
            logger.info(`    Setup:        ${setupTime.toFixed(0)}ms`);
            if (cacheStats.hits > 0 || cacheStats.misses > 0) {
                logger.info(`    Cache:        ${cacheStats.hitRate}% hit (${cacheStats.hits}/${cacheStats.hits + cacheStats.misses})`);
            }
        }

        // Show errors if any
        if (result.failed > 0 && result.errors.length > 0) {
            logger.info("");
            logger.info(`  Errors (${result.errors.length}):`);
            for (const err of result.errors.slice(0, 10)) { // Show max 10 errors
                logger.info(`    - ${err}`);
            }
            if (result.errors.length > 10) {
                logger.info(`    ... and ${result.errors.length - 10} more`);
            }
        }
    }

    private async processStream(
        render: (data: any) => string,
        baseUrl: string,
        cssContent: string,
        headerTpl: string | undefined,
        footerTpl: string | undefined,
        pool: BrowserPool
    ): Promise<{ processed: number; pages: number; totalBytes: number; failed: number; errors: string[] }> {
        const { opts, logger } = this;
        const tag = opts.streamTag!;
        let index = 0;
        let totalPages = 0;
        let totalBytes = 0;
        let failed = 0;
        const errors: string[] = [];

        if (opts.mode === "single") {
            throw new Error("Streaming with --mode=single is not supported.");
        }

        // Implement backpressure with semaphore
        // Allow 2x concurrency in flight to keep pipeline full without unbounded queuing
        const semaphore = new Semaphore(opts.concurrency * 2);
        const inFlight: Promise<void>[] = [];
        let completed = 0;

        // For streaming, we don't know total upfront
        // Priority: --totalRecords > --limit > filename pattern (e.g. _100000.xml) > default 1000
        let estimatedTotal = 1000;
        if (opts.totalRecords) {
            estimatedTotal = opts.totalRecords;
        } else if (opts.limit) {
            estimatedTotal = opts.limit;
        } else {
            // Try to extract count from filename pattern like "bank_statements_100000.xml"
            const match = opts.input.match(/_(\d+)\.[^.]+$/);
            if (match) {
                estimatedTotal = parseInt(match[1], 10);
            }
        }
        const progress = new ProgressBar(estimatedTotal, opts.logLevel);

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
                            totalPages += countPdfPages(bytes);
                        }
                        totalBytes += bytes.length;

                        const fileName = applyOutNamePattern(opts.outName, currentIndex, rec);
                        const outPath = join(opts.outDir, fileName);
                        await Deno.writeFile(outPath, bytes);
                        logger.debug(`Task ${currentIndex}: PDF written`);
                    } finally {
                        await pool.release(page);
                        logger.debug(`Task ${currentIndex}: Page released`);
                    }
                } catch (err) {
                    failed++;
                    const errMsg = `Record ${currentIndex}: ${err instanceof Error ? err.message : String(err)}`;
                    errors.push(errMsg);
                    logger.error(`Failed to process record ${currentIndex}:`, err);
                } finally {
                    semaphore.release();
                    completed++;
                    progress.update(completed);
                }
            })();

            inFlight.push(task);

            // Log queue length periodically
            if (currentIndex % 100 === 0) {
                logger.debug(`Queue length: ${semaphore.getQueueLength()}`);
            }

            if (opts.limit && index >= opts.limit) break;
        }

        // Wait for all remaining tasks
        await Promise.all(inFlight);
        progress.finish();
        const count = Math.min(index, opts.limit ?? index);
        return { processed: count - failed, pages: totalPages, totalBytes, failed, errors };
    }

    private async processBatch(
        render: (data: any) => string,
        baseUrl: string,
        cssContent: string,
        headerTpl: string | undefined,
        footerTpl: string | undefined,
        pool: BrowserPool
    ): Promise<{ processed: number; pages: number; totalBytes: number; failed: number; errors: string[] }> {
        const { opts, logger } = this;
        const inputText = await Deno.readTextFile(opts.input);

        // Auto-detect input format based on file extension
        const ext = extname(opts.input).toLowerCase();
        let records: unknown[];

        if (ext === ".json") {
            records = opts.recordPath
                ? findJsonRecords(JSON.parse(inputText), opts.recordPath)
                : parseJsonInput(inputText);
        } else {
            // Default to XML parsing
            const xmlRoot = parseXml(inputText);
            records = findRecords(xmlRoot, opts.recordPath);
        }

        const total = opts.limit ? Math.min(records.length, opts.limit) : records.length;
        let totalPages = 0;
        let totalBytes = 0;
        let failed = 0;
        const errors: string[] = [];

        logger.debug(`Records: ${records.length}${opts.limit ? ` (processing ${total})` : ""}`);;

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

                totalPages = countPdfPages(bytes);

                const base = basename(opts.input, extname(opts.input));
                const outPath = join(opts.outDir, `${base}.pdf`);
                await Deno.writeFile(outPath, bytes);
                logger.info(`Wrote single PDF: ${outPath}`);
                return { processed: total, pages: totalPages, totalBytes: bytes.length, failed: 0, errors: [] };
            } finally {
                await pool.release(page);
            }
        } else {
            // Multi mode
            let nextIndex = 0;
            let processed = 0;
            const progress = new ProgressBar(total, opts.logLevel);
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
                            totalPages += countPdfPages(bytes);
                        }
                        totalBytes += bytes.length;

                        const fileName = applyOutNamePattern(opts.outName, i, rec);
                        const outPath = join(opts.outDir, fileName);
                        await Deno.writeFile(outPath, bytes);
                        processed++;
                        progress.update(processed);
                    } catch (err) {
                        failed++;
                        const errMsg = `Record ${i}: ${err instanceof Error ? err.message : String(err)}`;
                        errors.push(errMsg);
                        logger.error(`Failed to process record ${i}:`, err);
                    } finally {
                        await pool.release(page);
                    }
                }
            };
            const workers = Array.from({ length: opts.concurrency }, (_, id) => worker(id));
            await Promise.all(workers);
            progress.finish();
            return { processed, pages: totalPages, totalBytes, failed, errors };
        }
    }
}
