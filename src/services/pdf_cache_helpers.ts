
/**
 * Gets the current asset cache statistics.
 */
export function getAssetCacheStats() {
    return globalAssetCache.getStats();
}

/**
 * Clears the asset cache.
 */
export function clearAssetCache() {
    globalAssetCache.clear();
}
