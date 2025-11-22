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
};

export type LogLevel = "quiet" | "info" | "debug" | "warn";

export type RecordData = Record<string, any>;
