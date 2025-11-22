# Backlog

## 🚀 Phase 1: Demo Readiness (Must-Haves)
*Goal: Create a stable, high-fidelity, and impressive demo for the CCM sector.*

### Robustness & Stability (Critical)
- [x] **Fix Puppeteer Crash**: Resolve `ConnectionClosedError` when running with high concurrency.
  - [x] Investigate resource exhaustion or race conditions in `htmlToPdfBytes`.
  - [x] Implement a robust worker pool that recycles browser instances safely.
- [x] **Error Isolation**: Ensure a single failed record does not crash the entire batch.

### Template Engine (Handlebars)
- [x] **Implement Handlebars**: Replace basic string replacement with `npm:handlebars`.
- [x] **Logic & Control Flow**: Support `{{#if}}`, `{{#each}}`, `{{#unless}}`.
- [x] **Formatting Helpers**:
  - [x] `{{formatDate value pattern}}`
  - [x] `{{formatCurrency value currency locale}}`
  - [x] `{{formatNumber value decimals}}`

### Advanced Layout & Visuals
- [x] **Header/Footer & Pagination**:
  - [x] Implement standard header/footer injection for Browser engine.
  - [x] Support "Page X of Y" placeholders.
- [x] **Dynamic Charts**:
  - [x] Integrate a charting library (e.g., Chart.js or QuickChart) to render graphs in the PDF (e.g., "Spending Breakdown").
- [ ] **Asset Management**:
  - [ ] Ensure relative paths for images (logos) and fonts work correctly in the rendered PDF.

### Demo Content & Collateral
- [ ] **Real-World Bank Statement**: Create realistic data and template.
- [x] **Product Data Sheet**: Create a template with features, requirements, and intro.

---

## 🛡️ Phase 2: Production Hardening
*Goal: Make the engine reliable, testable, and easy to operate in production.*

### Quality & Testing
- [ ] **CI/CD Pipeline**: Set up GitHub Actions to run tests and linting on every push.
- [ ] **Unit Tests**:
  - [ ] `xml.ts`: Verify `streamXmlElements` handles chunk boundaries correctly.
  - [ ] `template.ts`: Verify Handlebars helpers and logic.
- [ ] **Integration Tests**:
  - [ ] End-to-end test with a "Golden Master" PDF comparison.

### Performance & Streaming
- [ ] **Backpressure**: Implement backpressure in the streaming pipeline to prevent memory spikes.
- [ ] **Batch Tuning**: Optimize batch sizes for different concurrency levels.
- [x] **Browser Context Reuse**: Reuse browser pages/contexts instead of creating new ones for every record to reduce overhead. *(Completed 2025-11-20: ~2x throughput improvement)*
- [ ] **Headless Shell**: Switch to `chrome-headless-shell` for faster startup and lower memory footprint.
- [ ] **Asset Caching**: Implement request interception to cache/block network requests for assets (CSS, images, fonts).
- [ ] **Cluster Management**: Evaluate `puppeteer-cluster` for more efficient worker management.
- [ ] **Server Benchmarking**: Measure performance on a server environment with varying levels of concurrency to validate vertical scaling.
- [ ] **Complex Benchmark Suite**: Create a "Stress Test" scenario with:
  - [ ] **Heavy Template**: Multi-page invoice with charts, images, and complex conditional logic.
  - [ ] **Real-World Data**: Dataset with variable record sizes (1-50 pages per record) to test streaming stability.

### Deployment & Observability
- [ ] **Executable Binary**: Compile to standalone executable.
- [x] **Performance Metrics**: Measure pages/sec and generation phases.
- [ ] **Detailed Logging**: More granular logs.
- [ ] **Job Statistics**: Output TXT/PDF report with generation stats.

### Configuration & UX
- [ ] **Config File**: Support `composition.config.json` for default settings.
- [ ] **CLI Improvements**: Better progress bars and actionable error messages.
- [ ] **Style Library**: Create a unified CSS style set for product branding.
  - [ ] Define brand colors, fonts, and design patterns.
  - [ ] Update example templates (datasheet, invoice, statement) to use consistent styling.
  - [ ] Provide reusable CSS components for common document elements.

---

## 🔮 Phase 3: Future Features (Competitive Parity)
*Goal: Match features of enterprise CCM tools like DocBridge Impress and OL Connect.*

- [ ] **Interfaces**:
  - [ ] **REST API**: Server implementation alongside CLI.
- [ ] **Legacy Output**:
  - [ ] Support PCL and AFP formats.
- [ ] **Multi-Channel Output**:
  - [ ] Generate HTML emails alongside PDFs (Omnichannel).
  - [ ] Responsive templates that adapt to device size (Digital First).
- [ ] **Multi-Language Support**:
  - [ ] Internationalization (i18n) helpers (e.g., `{{t "invoice_date"}}`).
  - [ ] Load translation files (JSON/YAML) dynamically.
  - [ ] Support RTL languages (Arabic, Hebrew).
- [ ] **Visual Designer**:
  - [ ] Web-based drag-and-drop template builder (WYSIWYG).
  - [ ] Interactive preview with real data.
- [ ] **Multi-Template Routing**: Select template dynamically based on record data.
- [ ] **Input Formats**: Support JSON and CSV input sources.
- [ ] **Output Options**: Support ZIP archiving of generated PDFs.
- [ ] **Sandboxing**: Secure execution environment for untrusted templates.

---

## ✅ Completed
- [x] **Refactor Project**: Extracted core logic into `engine.ts`, `xml.ts`, etc.
- [x] **Remove Python**: Replaced `gen_data.py` with Deno-based `src/gen_data.ts` and `src/gen_invoice_data.ts`.
- [x] **Documentation**: Rewrote README with "Kitchen Sink" examples and clear usage guides.
- [x] **Type Safety**: Improved TypeScript types for XML records.
- [x] **Skip Page Count**: Added `--skip-page-count` CLI option to bypass PDF parsing for performance.
- [x] **Project Restructuring**:
  - [x] Modularized source code into `core`, `services`, `generators`, and `utils`.
  - [x] Created dedicated `debug`, `tests`, and `templates/assets` directories.
  - [x] Implemented `config.ts` for centralized configuration.
  - [x] Added unit tests for core engine logic.
