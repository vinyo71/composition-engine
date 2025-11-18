# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-11-18
### Added
- **Browser Pool**: Implemented `BrowserPool` to manage Puppeteer instances, preventing crashes under high concurrency.
- **Invoice Example**: Added a complex invoice generation script (`gen_invoices`), HTML template, and CSS.
- **CLI Improvements**: Made `input`, `template`, and `outDir` arguments mandatory for better UX.
- **Streaming Support**: Enhanced `xml.ts` to stream large XML files with low memory usage.
- **Versioning**: Introduced `deno.json` versioning and this changelog.

### Changed
- **Refactor**: Moved core logic from `cli.ts` to `engine.ts`, `xml.ts`, and `pdf.ts`.
- **Dependencies**: Removed Python dependency; data generation is now 100% TypeScript.
- **Documentation**: Rewrote `README.md` with clear "Kitchen Sink" examples and usage guides.

### Fixed
- **Puppeteer Crash**: Resolved `ConnectionClosedError` by limiting concurrent browser tabs and recycling instances.
- **Resource Leaks**: Fixed file handle leaks in XML streaming.
