# Backlog

Status legend
- [ ] Todo
- [~] In progress
- [x] Done

Now (high impact)
- [ ] Refractor project
- [ ] Browser engine
  - [ ] Add header/footer support (per page) with placeholders (page X of Y, date)
  - [ ] Page-break controls via CSS classes and template hooks
  - [ ] Reuse a pool of pages/tabs for performance (limit concurrent pages to concurrency)
- [ ] Streaming
  - [ ] Add backpressure controls and progress reporting (every N items)
  - [ ] Support XML namespaces in streamTag detection
- [ ] CLI/UX
  - [ ] --chrome auto-detect messaging: add actionable hints if not found
  - [x] --css <file> to inject external styles for browser engine
  - [ ] --locale, --dateFormat, --currency to format values in templates

Next
- [ ] Template engine
  - [ ] Helpers: {{formatDate path pattern}}, {{formatAmount path currency/locale}}
  - [ ] Conditionals: {{#if path}}...{{/if}} and {{#unless path}}...{{/unless}}
  - [ ] Partials/includes for shared header/footer blocks
- [ ] XML
  - [ ] Robust record discovery: multiple arrays, named paths, and heuristics
  - [ ] Validate record shape and provide user-friendly diffs for missing fields
- [ ] Error handling
  - [ ] Per-record error isolation (skip and continue, write a .err log)
  - [ ] Retry policy for browser render failures (transient crashes)
- [ ] Logging/metrics
  - [x] --logLevel (info|warn|debug), structured logs
  - [x] Timing summary: parse, render, write; throughput metrics
- [ ] Performance
  - [ ] Batch size tuning in streaming multi mode
  - [x] Memory guardrails for single mode with huge datasets (auto-switch or warn)
- [ ] Output
  - [ ] Zip output option (--zip) for multi PDFs
  - [ ] Deterministic file naming options: --pad <digits>, --prefix/--suffix
- [ ] Config
  - [ ] composition.config.json support (defaults, profiles), override via CLI

Later
- [ ] Multi-template routing (choose template by record property/XPath)
- [ ] Image/assets bundling for browser engine (local asset base path)
- [ ] Sandbox for untrusted templates
- [ ] CSV/JSON input support in addition to XML
- [ ] Windows-specific path normalization improvements in CLI

Quality
- [ ] Tests
  - [ ] Unit tests: xml.ts, template.ts
  - [ ] Integration: render small dataset and golden-compare page count
  - [ ] Streaming tests with synthetic large XML
- [ ] CI
  - [ ] GitHub Actions: deno fmt, lint, check, test; cache npm/jsr
  - [ ] Optional: upload sample artifacts (first 10 PDFs)

Docs
- [ ] README
  - [ ] Add section for formatting helpers and examples once implemented
  - [ ] Add troubleshooting for headless browser sandbox flags (Linux)
- [ ] Examples
  - [ ] Include 2–3 example templates (minimal, table-heavy, locale formats)
