import { parseArgs } from "jsr:@std/cli/parse-args";
import { CompositionOptions, Mode, LogLevel } from "./types.ts";
import { Logger } from "./utils/logger.ts";

export function getDefaultOptions(): Partial<CompositionOptions> {
    return {
        outName: "{index}.pdf",
        format: "pdf",
        mode: "multi",
        concurrency: Math.max(1, (globalThis as any).navigator?.hardwareConcurrency ?? 4),
        logLevel: "info",
    };
}

export function parseConfig(args: string[]): CompositionOptions {
    const parsed = parseArgs(args, {
        alias: {
            i: "input",
            t: "template",
            o: "outDir",
            n: "outName",
            f: "format",
            m: "mode",
            r: "recordPath",
            c: "concurrency",
            l: "limit",
            ll: "logLevel",
        },
        string: ["input", "template", "outDir", "outName", "format", "mode", "recordPath", "streamTag", "chrome", "css", "headerTemplate", "footerTemplate", "logLevel", "totalRecords"],
        boolean: ["version", "skipPageCount"],
    });

    if (parsed.version) {
        try {
            const config = JSON.parse(Deno.readTextFileSync(new URL("../deno.json", import.meta.url)));
            console.log(`Composition Engine v${config.version}`);
        } catch {
            console.log("Composition Engine (version unknown)");
        }
        Deno.exit(0);
    }

    const defaults = getDefaultOptions();

    // Required arguments with actionable error messages
    if (!parsed.input) {
        console.error("❌ Error: --input <path> is required.");
        console.error("   Specify the path to your XML data file.");
        console.error("   Example: deno task compose --input ./inp/data.xml --template ./templates/tpl.html --outDir ./out");
        Deno.exit(1);
    }
    if (!parsed.template) {
        console.error("❌ Error: --template <path> is required.");
        console.error("   Specify the path to your HTML template file.");
        console.error("   Example: deno task compose --input ./inp/data.xml --template ./templates/tpl.html --outDir ./out");
        Deno.exit(1);
    }
    if (!parsed.outDir) {
        console.error("❌ Error: --outDir <path> is required.");
        console.error("   Specify the output directory for generated PDFs.");
        console.error("   Example: deno task compose --input ./inp/data.xml --template ./templates/tpl.html --outDir ./out");
        Deno.exit(1);
    }

    const opts: CompositionOptions = {
        input: String(parsed.input),
        template: String(parsed.template),
        outDir: String(parsed.outDir),
        outName: String(parsed.outName ?? defaults.outName),
        format: (parsed.format ?? defaults.format) as "pdf",
        mode: (parsed.mode ?? defaults.mode) as Mode,
        recordPath: parsed.recordPath ? String(parsed.recordPath) : undefined,
        concurrency: parsed.concurrency ? Number(parsed.concurrency) : defaults.concurrency!,
        limit: parsed.limit ? Number(parsed.limit) : undefined,
        streamTag: parsed.streamTag ? String(parsed.streamTag) : undefined,
        chrome: parsed.chrome ? String(parsed.chrome) : undefined,
        css: parsed.css ? String(parsed.css) : undefined,
        headerTemplate: parsed.headerTemplate ? String(parsed.headerTemplate) : undefined,
        footerTemplate: parsed.footerTemplate ? String(parsed.footerTemplate) : undefined,
        logLevel: (parsed.logLevel ?? defaults.logLevel) as LogLevel,
        skipPageCount: parsed.skipPageCount ? Boolean(parsed.skipPageCount) : false,
        totalRecords: parsed.totalRecords ? Number(parsed.totalRecords) : undefined,
    };

    validateOptions(opts);
    return opts;
}

function validateOptions(opts: CompositionOptions) {
    const logger = new Logger(opts.logLevel);

    if (opts.format !== "pdf") {
        logger.error(`Unsupported --format=${opts.format}. Only 'pdf' is supported.`);
        Deno.exit(2);
    }
    if (opts.mode !== "single" && opts.mode !== "multi") {
        logger.error(`Unsupported --mode=${opts.mode}. Use 'single' or 'multi'.`);
        Deno.exit(2);
    }
    if (opts.logLevel !== "quiet" && opts.logLevel !== "info" && opts.logLevel !== "debug") {
        logger.error(`Unsupported --logLevel=${opts.logLevel}. Use 'quiet', 'info', or 'debug'.`);
        Deno.exit(2);
    }
    if (!Number.isFinite(opts.concurrency) || opts.concurrency < 1) {
        logger.error(`Invalid --concurrency value.`);
        Deno.exit(2);
    }
}
