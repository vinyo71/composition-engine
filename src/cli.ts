import { parseArgs } from "jsr:@std/cli/parse-args";
import { CompositionEngine } from "./engine.ts";
import { CompositionOptions, Mode, Engine } from "./types.ts";
import { Logger, LogLevel } from "./logger.ts";

function getDefaultOptions(): Partial<CompositionOptions> {
  return {
    outName: "{index}.pdf",
    format: "pdf",
    mode: "multi",
    concurrency: Math.max(1, (globalThis as any).navigator?.hardwareConcurrency ?? 4),
    engine: "browser",
    logLevel: "info",
  };
}

function parseCli(): CompositionOptions {
  const args = parseArgs(Deno.args, {
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
      e: "engine",
      ll: "logLevel",
    },
    string: ["input", "template", "outDir", "outName", "format", "mode", "recordPath", "font", "streamTag", "engine", "chrome", "css", "headerTemplate", "footerTemplate", "logLevel"],
    boolean: ["version", "skipPageCount"],
  });

  if (args.version) {
    try {
      const config = JSON.parse(Deno.readTextFileSync(new URL("../deno.json", import.meta.url)));
      console.log(`Composition Engine v${config.version}`);
    } catch {
      console.log("Composition Engine (version unknown)");
    }
    Deno.exit(0);
  }

  const defaults = getDefaultOptions();

  // Required arguments
  if (!args.input) {
    console.error("Error: --input <path> is required.");
    Deno.exit(1);
  }
  if (!args.template) {
    console.error("Error: --template <path> is required.");
    Deno.exit(1);
  }
  if (!args.outDir) {
    console.error("Error: --outDir <path> is required.");
    Deno.exit(1);
  }

  const opts: CompositionOptions = {
    input: String(args.input),
    template: String(args.template),
    outDir: String(args.outDir),
    outName: String(args.outName ?? defaults.outName),
    format: (args.format ?? defaults.format) as "pdf",
    mode: (args.mode ?? defaults.mode) as Mode,
    recordPath: args.recordPath ? String(args.recordPath) : undefined,
    concurrency: args.concurrency ? Number(args.concurrency) : defaults.concurrency!,
    limit: args.limit ? Number(args.limit) : undefined,
    font: args.font ? String(args.font) : undefined,
    streamTag: args.streamTag ? String(args.streamTag) : undefined,
    engine: (args.engine ?? defaults.engine) as Engine,
    chrome: args.chrome ? String(args.chrome) : undefined,
    css: args.css ? String(args.css) : undefined,
    headerTemplate: args.headerTemplate ? String(args.headerTemplate) : undefined,
    footerTemplate: args.footerTemplate ? String(args.footerTemplate) : undefined,
    logLevel: (args.logLevel ?? defaults.logLevel) as LogLevel,
    skipPageCount: args.skipPageCount ? Boolean(args.skipPageCount) : false,
  };

  const logger = new Logger(opts.logLevel);

  if (opts.format !== "pdf") {
    logger.error(`Unsupported --format=${opts.format}. Only 'pdf' is supported.`);
    Deno.exit(2);
  }
  if (opts.mode !== "single" && opts.mode !== "multi") {
    logger.error(`Unsupported --mode=${opts.mode}. Use 'single' or 'multi'.`);
    Deno.exit(2);
  }
  if (opts.engine !== "pdf-lib" && opts.engine !== "browser") {
    logger.error(`Unsupported --engine=${opts.engine}. Use 'pdf-lib' or 'browser'.`);
    Deno.exit(2);
  }
  if (opts.logLevel !== "quiet" && opts.logLevel !== "info" && opts.logLevel !== "debug") {
    logger.error(`Unsupported --logLevel=${opts.logLevel}. Use 'quiet', 'info', or 'debug'.`);
    Deno.exit(2);
  }
  if (opts.engine === "pdf-lib") {
    logger.warn("Warning: --engine=pdf-lib is deprecated and will be removed in a future version. The default is now 'browser'.");
  }
  if (!Number.isFinite(opts.concurrency) || opts.concurrency < 1) {
    logger.error(`Invalid --concurrency value.`);
    Deno.exit(2);
  }
  return opts;
}

async function main() {
  const opts = parseCli();
  const engine = new CompositionEngine(opts);

  try {
    await engine.process();
  } catch (err) {
    console.error("Fatal error:", err);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  main();
}