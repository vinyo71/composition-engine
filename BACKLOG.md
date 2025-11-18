# Backlog

## 🚀 Phase 1: Demo Readiness (Must-Haves)
*Goal: Create a stable, high-fidelity, and impressive demo for the CCM sector.*

### Robustness & Stability (Critical)
- [ ] **Fix Puppeteer Crash**: Resolve `ConnectionClosedError` when running with high concurrency.
  - [ ] Investigate resource exhaustion or race conditions in `htmlToPdfBytes`.
  - [ ] Implement a robust worker pool that recycles browser instances safely.
- [ ] **Error Isolation**: Ensure a single failed record does not crash the entire batch.

### Template Engine (Handlebars)
- [ ] **Implement Handlebars**: Replace basic string replacement with `npm:handlebars`.
- [ ] **Logic & Control Flow**: Support `{{#if}}`, `{{#each}}`, `{{#unless}}`.
- [ ] **Formatting Helpers**:
  - [ ] `{{formatDate value pattern}}`
  - [ ] `{{formatCurrency value currency locale}}`
  - [ ] `{{formatNumber value decimals}}`

### Advanced Layout & Visuals
- [ ] **Header/Footer & Pagination**:
  - [ ] Implement standard header/footer injection for Browser engine.
  - [ ] Support "Page X of Y" placeholders.
- [ ] **Dynamic Charts**:
  - [ ] Integrate a charting library (e.g., Chart.js or QuickChart) to render graphs in the PDF (e.g., "Spending Breakdown").
- [ ] **Asset Management**:
  - [ ] Ensure relative paths for images (logos) and fonts work correctly in the rendered PDF.

---

## 🛡️ Phase 2: Production Hardening
*Goal: Make the engine reliable, testable, and easy to operate in production.*

### Quality & Testing
- [ ] **Unit Tests**:
  - [ ] `xml.ts`: Verify `streamXmlElements` handles chunk boundaries correctly.
  - [ ] `template.ts`: Verify Handlebars helpers and logic.
- [ ] **Integration Tests**:
  - [ ] End-to-end test with a "Golden Master" PDF comparison.

### Performance & Streaming
- [ ] **Backpressure**: Implement backpressure in the streaming pipeline to prevent memory spikes.
- [ ] **Batch Tuning**: Optimize batch sizes for different concurrency levels.

### Configuration & UX
- [ ] **Config File**: Support `composition.config.json` for default settings.
- [ ] **CLI Improvements**: Better progress bars and actionable error messages.

---

## 🔮 Phase 3: Future Features (Competitive Parity)
*Goal: Match features of enterprise CCM tools like DocBridge Impress and OL Connect.*

- [ ] **Multi-Channel Output**:
  - [ ] Generate HTML emails alongside PDFs (Omnichannel).
  - [ ] Responsive templates that adapt to device size (Digital First).
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
