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

    async acquire(): Promise<Page> {
        if (!this.browser) {
            this.logger.debug("Initializing shared browser instance...");
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
        this.logger.info("Destroying browser pool...");

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
                "--disable-gpu",
            ],
        });
    }
}
