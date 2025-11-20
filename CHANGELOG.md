# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2025-11-20
### Added
- **Browser Context Reuse**: Refactored `BrowserPool` to pool `Page` instances instead of `Browser` instances, reusing pages across PDF generations.
  - Significant performance improvement: **~2x throughput** (6.8 → 13.2 pages/sec).
  - Single shared browser instance with page recycling reduces launch/close overhead.
  - Automatic page cleanup and error recovery for crashed/detached pages.

### Changed
- **`BrowserPool` Refactor**: Now pools Puppeteer `Page` objects and maintains a single `Browser` instance.
- **`CompositionEngine` Update**: Modified `processStream` and `processBatch` to acquire/release pages from the pool.
- **`htmlToPdfBytes` Optimization**: 
  - Changed `waitUntil` from `networkidle0` to `load` for faster rendering.
  - Reduced timeout from 120s to 30s.
  - Function now accepts both `Browser` (legacy) and `Page` (optimized) parameters.

## [0.1.1] - 2025-11-19
### Added
- **Performance Metrics**: Detailed timing summary with setup, processing, total time, total pages, and throughput (pages/sec).
- **Skip Page Count Option**: Introduced `--skipPageCount` CLI flag to bypass PDF parsing for page counting, improving performance.

### Changed
- Updated documentation and CLI reference to include new features.

### Fixed
- **Browser Pool Cleanup**: Suppressed noisy "Browser disconnected unexpectedly" warnings during normal shutdown.
- **Logger Types**: Added "warn" to LogLevel type for better type safety.

## [0.1.0] - 2025-11-18
### Added
- **Handlebars Support**: Replaced basic regex templating with full Handlebars support.
  - Added helpers: `formatDate`, `formatCurrency`, `formatNumber`, `eq`, `gt`, `lt`.
  - Updated invoice template to use conditional logic for overdue warnings.
- **Browser Pool**: Implemented `BrowserPool` to manage Puppeteer instances, preventing crashes under high concurrency.
- **Invoice Example**: Added a complex invoice generation script (`gen_invoices`), HTML template, and CSS.
- **CLI Improvements**: Made `input`, `template`, and `outDir` arguments mandatory for better UX.
- **Streaming Support**: Enhanced `xml.ts` to stream large XML files with low memory usage.
- **Versioning**: Introduced `deno.json` versioning and this changelog.
- **Header/Footer Support**: Added CLI flags `--headerTemplate` and `--footerTemplate` to inject HTML headers and footers into PDFs.
- **Pagination**: Supported standard page numbering classes (`date`, `title`, `url`, `pageNumber`, `totalPages`) in headers/footers.

### Changed
- **Refactor**: Moved core logic from `cli.ts` to `engine.ts`, `xml.ts`, and `pdf.ts`.
- **Dependencies**: Removed Python dependency; data generation is now 100% TypeScript.
- **Documentation**: Rewrote `README.md` with clear "Kitchen Sink" examples and usage guides.

### Fixed
- **Puppeteer Crash**: Resolved `ConnectionClosedError` by limiting concurrent browser tabs and recycling instances.
- **Resource Leaks**: Fixed file handle leaks in XML streaming.
