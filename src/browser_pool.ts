import { launch, Browser } from "npm:puppeteer";
import { Logger } from "./logger.ts";

export class BrowserPool {
    private pool: Browser[] = [];
    private active = 0;
    private waiting: ((browser: Browser) => void)[] = [];
    private logger: Logger;
    private destroying = false;

    constructor(
        private maxSize: number,
        private chromePath: string | undefined,
        logLevel: "quiet" | "info" | "debug" | "warn" = "info"
    ) {
        this.logger = new Logger(logLevel);
    }

    async acquire(): Promise<Browser> {
        // 1. Return an idle browser from the pool
        if (this.pool.length > 0) {
            this.logger.debug("Reusing idle browser from pool");
            return this.pool.pop()!;
        }

        // 2. Create a new browser if we haven't hit the limit
        if (this.active < this.maxSize) {
            this.active++;
            this.logger.debug(`Launching new browser (${this.active}/${this.maxSize})`);
            return await this.createBrowser();
        }

        // 3. Wait for a browser to become available
        this.logger.debug("Waiting for browser...");
        return new Promise<Browser>((resolve) => {
            this.waiting.push(resolve);
        });
    }

    release(browser: Browser) {
        if (this.waiting.length > 0) {
            const next = this.waiting.shift()!;
            this.logger.debug("Passing released browser to waiting task");
            next(browser);
        } else {
            this.logger.debug("Returning browser to pool");
            this.pool.push(browser);
        }
    }

    async destroy() {
        this.destroying = true;
        this.logger.info("Destroying browser pool...");
        await Promise.all(this.pool.map((b) => b.close()));
        this.pool = [];
        this.active = 0;
    }

    private async createBrowser(): Promise<Browser> {
        try {
            const browser = await launch({
                headless: "new",
                executablePath: this.chromePath,
                args: [
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-dev-shm-usage", // Fix for Docker/limited memory
                    "--disable-gpu",
                ],
            });

            // Handle unexpected disconnection
            browser.on("disconnected", () => {
                if (this.destroying) return;
                this.logger.warn("Browser disconnected unexpectedly");
                this.active--;
                // Remove from pool if present
                const idx = this.pool.indexOf(browser);
                if (idx !== -1) {
                    this.pool.splice(idx, 1);
                }
            });

            return browser;
        } catch (err) {
            this.active--;
            throw err;
        }
    }
}
