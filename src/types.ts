export type Mode = "multi" | "single";
// Engine type removed - browser is now the only engine

export type CompositionOptions = {
    input: string;
    template: string;
    outDir: string;
    outName: string; // pattern with tokens like {index}
    format: "pdf";
    mode: Mode;
    recordPath?: string;
    concurrency: number;
    limit?: number;
    streamTag?: string; // repeating element to stream from the XML (e.g., BankStatement)
    chrome?: string; // optional path to Chrome/Chromium/Edge executable
    css?: string; // optional path to a CSS file to inject into the HTML
    headerTemplate?: string; // optional path to header HTML file
    footerTemplate?: string; // optional path to footer HTML file
    logLevel: LogLevel;
    skipPageCount?: boolean;
    totalRecords?: number; // expected record count for progress bar in streaming mode
    jsonOutput?: boolean; // output results as JSON (for scripting/automation)
    verbose?: boolean; // show additional details (cache stats, concurrency, etc.)
};

export type LogLevel = "quiet" | "info" | "debug" | "warn";

export type RecordData = Record<string, any>;

// Result type for job output
export type JobResult = {
    status: "success" | "warning" | "error";
    input: string;
    output: string;
    processed: number;
    failed: number;
    pages: number;
    totalBytes: number;
    timeMs: number;
    pdfsPerSec: number;
    pagesPerSec: number;
    errors: string[];
};

