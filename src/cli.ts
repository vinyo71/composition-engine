import { parseArgs } from "jsr:@std/cli/parse-args";
import { CompositionEngine } from "./engine.ts";
import { CompositionOptions, Mode, Engine, LogLevel } from "./types.ts";
import { Logger } from "./logger.ts";

function getDefaultOptions(): CompositionOptions {
  return {
    input: "./inp/bank_statements_1000.xml",
    template: "./templates/statement.html",
    outDir: "./out",
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
    string: ["input", "template", "outDir", "outName", "format", "mode", "recordPath", "font", "streamTag", "engine", "chrome", "css", "logLevel"],
    boolean: [],
  });

  const defaults = getDefaultOptions();
  const opts: CompositionOptions = {
    input: String(args.input ?? defaults.input),
    template: String(args.template ?? defaults.template),
    outDir: String(args.outDir ?? defaults.outDir),
    outName: String(args.outName ?? defaults.outName),
    format: (args.format ?? defaults.format) as "pdf",
    mode: (args.mode ?? defaults.mode) as Mode,
    recordPath: args.recordPath ? String(args.recordPath) : undefined,
    concurrency: args.concurrency ? Number(args.concurrency) : defaults.concurrency,
    limit: args.limit ? Number(args.limit) : undefined,
    font: args.font ? String(args.font) : undefined,
    streamTag: args.streamTag ? String(args.streamTag) : undefined,
    engine: (args.engine ?? defaults.engine) as Engine,
    chrome: args.chrome ? String(args.chrome) : undefined,
    css: args.css ? String(args.css) : undefined,
    logLevel: (args.logLevel ?? defaults.logLevel) as LogLevel,
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
    const logger = new Logger(opts.logLevel);
    logger.error("Fatal error:", err);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  main();
}