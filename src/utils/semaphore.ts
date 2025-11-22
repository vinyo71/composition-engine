/**
 * Semaphore for controlling concurrent access to resources.
 * Useful for implementing backpressure in streaming pipelines.
 */
export class Semaphore {
    private permits: number;
    private waiting: (() => void)[] = [];

    /**
     * Creates a new Semaphore with the specified number of permits.
     * @param initialPermits Number of permits available (max concurrent operations)
     */
    constructor(initialPermits: number) {
        if (initialPermits <= 0) {
            throw new Error("Initial permits must be positive");
        }
        this.permits = initialPermits;
    }

    /**
     * Acquires a permit, waiting if necessary until one is available.
     * Returns immediately if a permit is available, otherwise blocks.
     */
    async acquire(): Promise<void> {
        if (this.permits > 0) {
            this.permits--;
            return;
        }
        return new Promise((resolve) => {
            this.waiting.push(resolve);
        });
    }

    /**
     * Releases a permit, making it available for waiting tasks.
     */
    release(): void {
        if (this.waiting.length > 0) {
            const resolve = this.waiting.shift()!;
            resolve();
        } else {
            this.permits++;
        }
    }

    /**
     * Gets the current number of available permits.
     */
    availablePermits(): number {
        return this.permits;
    }

    /**
     * Gets the number of tasks waiting for a permit.
     */
    getQueueLength(): number {
        return this.waiting.length;
    }
}
