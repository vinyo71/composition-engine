# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.1] - 2026-01-25
### Added
- **JSON Output Mode**: New `--json` flag outputs machine-readable job results for scripting/automation.
- **Verbose Mode**: New `--verbose` / `-v` flag shows additional details (concurrency, mode, cache stats).
- **Error Tracking**: Failed records are now tracked and reported with specific error messages in the job summary.
- **Status Indicators**: Clear `[OK]`, `[WARN]`, `[ERR]` status in job summary for quick visual feedback.

### Changed
- **Improved Job Summary**: Cleaner, more informative output with input file, output path, and comprehensive metrics:
  - PDFs, Pages (with avg), Throughput, Size, and Time
  - Hidden debug messages (e.g., "Destroying browser pool..." now requires `--logLevel debug`)
- **Lightweight Page Counter**: Replaced pdf-lib page counting with regex-based parsing (~10x faster, zero overhead).
- **Cleanup**: Removed `pdf-lib` dependency completely.
- **Cleanup**: Removed unused cache helper files.

### Fixed
- **Stream Tag Matching**: Fixed XML streaming to use exact tag matching. Previously `--streamTag Portfolio` incorrectly matched `<PortfolioReport>`.
- **Process Exit**: Fixed app not exiting after completion due to dangling browser pool resources.

## [0.5.0] - 2026-01-23
### Added
- **Portfolio Report Template**: Premium 4-page investment portfolio report template (`portfolio.html`).
  - Executive summary with KPIs and risk metrics.
  - Interactive Chart.js donut and bar charts for asset allocation.
  - Detailed holdings table and activity summary.
- **Chart.js Integration**: Full support for embedding dynamic charts in PDFs.
  - Solved Handlebars compatibility issues by pre-computing chart data as JSON in the generator.
  - Added `ChartData` section to XML output with `AllocLabels`, `AllocData`, etc.

## [0.4.2] - 2026-01-23
### Added
- **Progress Bar**: Real-time progress display during PDF generation.
  - Shows progress bar, percentage, throughput (PDFs/sec), and ETA.
  - New `ProgressBar` class (`src/utils/progress.ts`) with throttled rendering.
  - Integrated into both streaming and batch processing modes.
- **Actionable Error Messages**: CLI errors now include helpful examples.
  - Missing required arguments show usage examples.
  - Emoji indicators (❌) for quick visual identification.

## [0.4.1] - 2026-01-23
### Fixed
- **Event Handler Memory Leak**: Fixed memory leak in `pdf.ts` where request/response handlers were added to reused pages but never removed.
  - Handlers now properly removed in `finally` block after PDF generation.
- **LRU Cache Eviction**: Replaced full-cache-clear eviction with proper LRU eviction in `AssetCache`.
  - Tracks `lastAccess` timestamp per entry.
  - Evicts oldest entries when cache limit reached instead of clearing everything.
  - Added `evictions` counter to cache stats.

### Performance
- **Cached PDFDocument Import**: The pdf-lib module is now imported once and cached instead of dynamically imported per-record.
  - Added `getPdfLib()` helper function to cache the import.
  - Reduces module resolution overhead when page counting is enabled.

## [0.4.0] - 2025-11-22
### Added
- **Backpressure Control**: Implemented semaphore-based backpressure in streaming pipeline to prevent memory spikes during high-volume processing.
  - Limits in-flight tasks to `concurrency * 2` to keep pipeline full without unbounded queuing
  - Added `Semaphore` utility class (`src/utils/semaphore.ts`)
- **Asset Caching**: Implemented Puppeteer request interception to cache static assets (images, fonts, stylesheets).
  - 50MB configurable cache with automatic eviction
  - Cache hit/miss statistics tracking 
  - New `AssetCache` class (`src/services/asset_cache.ts`)
- **Headless Shell Support**: Auto-detection of `chrome-headless-shell` for faster startup and lower memory footprint.
  - Prioritizes headless shell over full Chrome with automatic fallback
  - Platform-specific executable path detection (Windows, macOS, Linux)

### Changed
- **Browser Engine Only**: Removed deprecated `pdf-lib` engine completely (~280 lines).
  - Removed `--engine` CLI option (browser is now the only option)
  - Removed all pdf-lib rendering functions from `pdf.ts`
  - Simplified `engine.ts` by removing conditional engine logic
  - PDFDocument now imported dynamically only for page counting when needed

### Performance
- Baseline throughput maintained: ~8-10 pages/sec
- Memory usage optimized with backpressure and headless shell
- Faster browser startup with chrome-headless-shell

## [0.3.1] - 2025-11-22
### Added
- **Real-World Bank Statement**: Enhanced bank statement template and data generator based on professional Hungarian bank statement formats.
  - Realistic Hungarian transaction types (bérutalás, készpénzfelvétel, bankkártyás fizetés, etc.)
  - Account summary with opening/closing balances and period totals
  - Transaction details with value dates and running balances
  - Hungarian IBAN format (HU + 26 digits) and proper HUF currency formatting
  - Professional bilingual styling matching real Hungarian bank statements
  - Hungarian merchants and realistic transaction amounts per category
  - Fictional bank names (Demo Bank, Példa Bank) for demo purposes

## [0.3.0] - 2025-11-22
### Added
- **Asset Management**: Support for relative paths in templates (images, fonts) via automatic `<base>` tag injection.
- **Dynamic Charts**: Integrated Chart.js support for data-driven charts in PDFs.
- **Project Restructuring**: Created dedicated directories for `debug/`, `tests/`, and `templates/assets/`.
- **Modular Architecture**: Split `src/` into `core/`, `services/`, `generators/`, and `utils/`.
- **Configuration Module**: Added `src/config.ts` for centralized configuration management.
- **Unit Tests**: Added `tests/engine_test.ts` with initial tests for XML parsing and template rendering.

### Changed
- **Refactor**: Moved all source files to their respective modules and updated imports.
- **CLI**: Refactored `src/cli.ts` to use the new configuration module.
- **Assets**: Moved CSS assets to `templates/assets/`.
- **Version Bump**: Updated to 0.3.0 in `deno.json` and `datasheet.xml`.

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
