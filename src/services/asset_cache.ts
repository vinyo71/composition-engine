import { HTTPRequest, HTTPResponse } from "npm:puppeteer";

interface CacheEntry {
    body: Buffer;
    contentType: string;
    status: number;
    size: number;
    lastAccess: number;
}

/**
 * Cache for browser assets (images, fonts, stylesheets) to avoid redundant network requests.
 * Uses Puppeteer's request interception to cache responses in memory with LRU eviction.
 */
export class AssetCache {
    private cache = new Map<string, CacheEntry>();
    private stats = { hits: 0, misses: 0, bytes: 0, evictions: 0 };
    private maxCacheSize: number;

    /**
     * Creates a new AssetCache.
     * @param maxSizeMB Maximum cache size in megabytes (default: 50MB)
     */
    constructor(maxSizeMB = 50) {
        this.maxCacheSize = maxSizeMB * 1024 * 1024;
    }

    /**
     * Intercepts a Puppeteer request and serves from cache if available.
     * Should be registered as a request handler with page.on('request', ...).
     */
    async intercept(request: HTTPRequest): Promise<void> {
        const url = request.url();
        const resourceType = request.resourceType();

        // Only cache specific resource types (images, fonts, stylesheets)
        if (!['image', 'font', 'stylesheet'].includes(resourceType)) {
            return request.continue();
        }

        // Check cache
        const cached = this.cache.get(url);
        if (cached) {
            this.stats.hits++;
            // Update access time for LRU
            cached.lastAccess = Date.now();
            return request.respond({
                status: cached.status,
                contentType: cached.contentType,
                body: cached.body,
            });
        }

        this.stats.misses++;
        // Continue request and don't cache response here
        // (caching happens in response handler)
        return request.continue();
    }

    /**
     * Handles a response to potentially cache it.
     * Should be registered as a response handler with page.on('response', ...).
     */
    async handleResponse(response: HTTPResponse): Promise<void> {
        const url = response.url();
        const request = response.request();
        const resourceType = request.resourceType();

        // Only cache successful responses for cacheable types
        if (!['image', 'font', 'stylesheet'].includes(resourceType)) {
            return;
        }

        if (response.status() !== 200) {
            return;
        }

        // Don't cache if already cached
        if (this.cache.has(url)) {
            return;
        }

        try {
            const body = await response.buffer();
            const contentType = response.headers()['content-type'] || 'application/octet-stream';
            const size = body.length;

            // Evict LRU entries if needed to make room
            this.evictIfNeeded(size);

            this.cache.set(url, {
                body,
                contentType,
                status: response.status(),
                size,
                lastAccess: Date.now(),
            });
            this.stats.bytes += size;
        } catch (_err) {
            // Ignore errors (e.g., response already consumed)
        }
    }

    /**
     * Evicts least recently used entries until there's room for bytesNeeded.
     */
    private evictIfNeeded(bytesNeeded: number): void {
        // If the new item alone exceeds max size, skip caching it
        if (bytesNeeded > this.maxCacheSize) {
            return;
        }

        while (this.stats.bytes + bytesNeeded > this.maxCacheSize && this.cache.size > 0) {
            // Find LRU entry
            let lruUrl: string | null = null;
            let lruTime = Infinity;

            for (const [url, entry] of this.cache) {
                if (entry.lastAccess < lruTime) {
                    lruTime = entry.lastAccess;
                    lruUrl = url;
                }
            }

            if (lruUrl) {
                const entry = this.cache.get(lruUrl)!;
                this.stats.bytes -= entry.size;
                this.stats.evictions++;
                this.cache.delete(lruUrl);
            }
        }
    }

    /**
     * Gets cache statistics.
     */
    getStats() {
        return {
            ...this.stats,
            cacheSize: this.cache.size,
            cacheMB: (this.stats.bytes / (1024 * 1024)).toFixed(2),
            hitRate: this.stats.hits + this.stats.misses > 0
                ? ((this.stats.hits / (this.stats.hits + this.stats.misses)) * 100).toFixed(1)
                : '0.0',
        };
    }

    /**
     * Clears the cache.
     */
    clear() {
        this.cache.clear();
        this.stats = { hits: 0, misses: 0, bytes: 0, evictions: 0 };
    }
}
