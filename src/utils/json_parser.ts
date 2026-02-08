/**
 * JSON Input Parser
 * Parses JSON files into record arrays for template processing.
 */

/**
 * Parse JSON input text and extract records array.
 * Supports:
 * - Array format: [{...}, {...}]
 * - Object with common wrapper keys: { records: [...] }, { data: [...] }, etc.
 * - Single object: {...} → wrapped in array
 */
export function parseJsonInput(text: string): unknown[] {
    // Strip UTF-8 BOM if present (common with Windows PowerShell encoded files)
    const cleanText = text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;
    const data = JSON.parse(cleanText);

    // Direct array
    if (Array.isArray(data)) {
        return data;
    }

    // Object with common wrapper keys
    const wrapperKeys = ["records", "data", "items", "rows", "results", "entries"];
    for (const key of wrapperKeys) {
        if (data[key] && Array.isArray(data[key])) {
            return data[key];
        }
    }

    // Single object → wrap in array
    if (typeof data === "object" && data !== null) {
        return [data];
    }

    throw new Error("Invalid JSON input: expected array or object with records");
}

/**
 * Find records in parsed JSON, optionally using a dot-notation path.
 * @param data Parsed JSON data
 * @param recordPath Optional dot-notation path (e.g., "response.data.items")
 */
export function findJsonRecords(data: unknown, recordPath?: string): unknown[] {
    if (!recordPath) {
        return parseJsonInput(JSON.stringify(data));
    }

    // Navigate to path
    let current: unknown = data;
    for (const key of recordPath.split(".")) {
        if (current && typeof current === "object" && key in current) {
            current = (current as Record<string, unknown>)[key];
        } else {
            throw new Error(`Path "${recordPath}" not found in JSON data`);
        }
    }

    if (Array.isArray(current)) {
        return current;
    }

    return [current];
}
