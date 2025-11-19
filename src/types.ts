export type Mode = "multi" | "single";
export type Engine = "pdf-lib" | "browser";

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
    font?: string; // optional path to a TTF/OTF that supports your locale
    streamTag?: string; // repeating element to stream from the XML (e.g., BankStatement)
    engine: Engine;
    chrome?: string; // optional path to Chrome/Chromium/Edge executable
    css?: string; // optional path to a CSS file to inject into the HTML
    headerTemplate?: string; // optional path to header HTML file
    footerTemplate?: string; // optional path to footer HTML file
    logLevel: "quiet" | "info" | "debug";
    skipPageCount?: boolean;
};

export type RecordData = Record<string, any>;
