/**
 * Progress bar for CLI output with ETA and throughput display.
 * Renders: [████████░░░░░░░░] 423/1000 (42%) | 12.3 PDFs/sec | ETA: 47s
 */
export class ProgressBar {
    private startTime: number;
    private lastRender: number = 0;
    private enabled: boolean;
    private total: number;
    private current: number = 0;

    /**
     * Creates a new ProgressBar.
     * @param total Total number of items to process
     * @param logLevel Current log level - progress is hidden in "quiet" mode
     */
    constructor(total: number, logLevel: "quiet" | "info" | "debug" | "warn" = "info") {
        this.total = total;
        this.enabled = logLevel !== "quiet";
        this.startTime = performance.now();
    }

    /**
     * Updates the progress bar display.
     * @param current Current progress count
     */
    update(current: number): void {
        this.current = current;

        if (!this.enabled) return;

        // Throttle rendering to avoid flicker (max 10 updates/sec)
        const now = performance.now();
        if (now - this.lastRender < 100 && current < this.total) return;
        this.lastRender = now;

        this.render();
    }

    /**
     * Increments progress by 1 and updates display.
     */
    increment(): void {
        this.update(this.current + 1);
    }

    /**
     * Renders the progress bar to stdout.
     */
    private render(): void {
        const { current, startTime } = this;

        // Auto-expand total if current exceeds estimate (streaming mode)
        if (current > this.total) {
            this.total = current;
        }

        const total = this.total;
        const elapsed = (performance.now() - startTime) / 1000; // seconds

        // Calculate metrics
        const percent = total > 0 ? Math.min(100, Math.floor((current / total) * 100)) : 0;
        const rate = elapsed > 0 ? current / elapsed : 0;
        const remaining = rate > 0 ? Math.max(0, (total - current) / rate) : 0;

        // Build progress bar with clamping to prevent negative repeat
        const barWidth = 20;
        const filled = Math.min(barWidth, Math.floor((current / total) * barWidth));
        const empty = Math.max(0, barWidth - filled);
        const bar = "█".repeat(filled) + "░".repeat(empty);

        // Format ETA
        const eta = this.formatTime(remaining);

        // Build output string
        const output = `\r[${bar}] ${current}/${total} (${percent}%) | ${rate.toFixed(1)} PDFs/sec | ETA: ${eta}`;

        // Write to stdout (without newline for inline update)
        Deno.stdout.writeSync(new TextEncoder().encode(output));
    }

    /**
     * Formats seconds into human-readable time.
     */
    private formatTime(seconds: number): string {
        if (!isFinite(seconds) || seconds < 0) return "--";
        if (seconds < 60) return `${Math.ceil(seconds)}s`;
        if (seconds < 3600) {
            const m = Math.floor(seconds / 60);
            const s = Math.ceil(seconds % 60);
            return `${m}m ${s}s`;
        }
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return `${h}h ${m}m`;
    }

    /**
     * Finishes the progress bar and moves to next line.
     */
    finish(): void {
        if (!this.enabled) return;

        // Final render
        this.update(this.current);

        // Move to next line
        Deno.stdout.writeSync(new TextEncoder().encode("\n"));
    }

    /**
     * Clears the progress bar line.
     */
    clear(): void {
        if (!this.enabled) return;
        Deno.stdout.writeSync(new TextEncoder().encode("\r" + " ".repeat(80) + "\r"));
    }
}
