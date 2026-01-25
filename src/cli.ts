import { CompositionEngine } from "./core/engine.ts";
import { parseConfig } from "./config.ts";

async function main() {
  const opts = parseConfig(Deno.args);
  const engine = new CompositionEngine(opts);

  try {
    await engine.process();
    Deno.exit(0); // Explicit exit to ensure clean termination
  } catch (err) {
    console.error("Fatal error:", err);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  main();
}
