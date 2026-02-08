import { launch, Browser, Page } from "npm:puppeteer";
import { Logger } from "../utils/logger.ts";

export class BrowserPool {
    private browser: Browser | null = null;
    private pages: Page[] = [];
    private active = 0;
    private waiting: ((page: Page) => void)[] = [];
    private logger: Logger;
    private destroying = false;

    constructor(
        private maxSize: number,
        private chromePath: string | undefined,
        logLevel: "quiet" | "info" | "debug" | "warn" = "info"
    ) {
        this.logger = new Logger(logLevel);
    }

    /**
     * Pre-warm the browser pool by creating all pages upfront.
     * Call this before processing to eliminate cold-start latency.
     */
    async initialize(): Promise<void> {
        if (!this.browser) {
            this.logger.debug("Initializing shared browser instance...");
            this.browser = await this.createBrowser();
        }

        // Pre-create all pages in parallel
        const pagesToCreate = this.maxSize - this.pages.length;
        if (pagesToCreate > 0) {
            const startTime = Date.now();
            const newPages = await Promise.all(
                Array.from({ length: pagesToCreate }, () => this.browser!.newPage())
            );
            this.pages.push(...newPages);
            this.active = this.pages.length;
            const elapsed = Date.now() - startTime;
            this.logger.info(`Pre-warmed ${pagesToCreate} browser pages in ${elapsed}ms`);
        }
    }

    async acquire(): Promise<Page> {
        // Lazy initialize if initialize() wasn't called
        if (!this.browser) {
            this.logger.debug("Lazy-initializing browser (consider calling initialize() first)");
            this.browser = await this.createBrowser();
        }

        // 1. Return an idle page from the pool
        if (this.pages.length > 0) {
            this.logger.debug("Reusing idle page from pool");
            return this.pages.pop()!;
        }

        // 2. Create a new page if we haven't hit the limit
        if (this.active < this.maxSize) {
            this.active++;
            this.logger.debug(`Creating new page (${this.active}/${this.maxSize})`);
            return await this.browser.newPage();
        }

        // 3. Wait for a page to become available
        this.logger.debug("Waiting for page...");
        return new Promise<Page>((resolve) => {
            this.waiting.push(resolve);
        });
    }

    async release(page: Page) {
        if (this.destroying) {
            try { await page.close(); } catch { /* ignore */ }
            return;
        }

        try {
            // Reset page state
            await page.goto("about:blank");
        } catch (err) {
            this.logger.warn("Failed to reset page, closing and creating replacement if needed", err);
            try { await page.close(); } catch { /* ignore */ }
            this.active--;
            return;
        }

        if (this.waiting.length > 0) {
            const next = this.waiting.shift()!;
            this.logger.debug("Passing released page to waiting task");
            next(page);
        } else {
            this.logger.debug("Returning page to pool");
            this.pages.push(page);
        }
    }

    async destroy() {
        this.destroying = true;
        this.logger.debug("Destroying browser pool...");

        // Close all pooled pages
        await Promise.all(this.pages.map((p) => p.close().catch(() => { })));
        this.pages = [];

        // Close browser
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
        this.active = 0;
    }

    private async createBrowser(): Promise<Browser> {
        return await launch({
            headless: "new",
            executablePath: this.chromePath,
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                // GPU acceleration for faster rendering
                "--enable-gpu-rasterization",
                "--enable-accelerated-2d-canvas",
                "--ignore-gpu-blocklist",
            ],
        });
    }
}
