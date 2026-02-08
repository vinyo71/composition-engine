# Composition Engine

![Version](https://img.shields.io/badge/version-0.6.1-blue.svg)
![Deno](https://img.shields.io/badge/deno-2.x-green.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

**High-performance, high-fidelity document generation at scale.**

The Composition Engine bridges the gap between raw data (XML/JSON) and
professional documents (PDF). It is designed to process massive datasets
efficiently, producing pixel-perfect documents using HTML templates and headless
browser rendering.

## Features

- **High Fidelity**: Uses a headless browser (Puppeteer) to render full
  HTML/CSS, ensuring your PDFs look exactly like your web templates.
- **Handlebars Templates**: Full support for logic (`{{#if}}`, `{{#each}}`) and
  formatting helpers (`formatCurrency`, `formatDate`, `ifEq`, `ifGt`).
- **Dual Input Formats**: Supports both XML and JSON with auto-detection from
  file extension.
- **Scalable Streaming**: Processes gigabyte-sized files with millions of
  records without loading the entire file into memory.
  - **Backpressure Control**: Prevents memory spikes with semaphore-based flow
    control
  - **Asset Caching**: Caches images, fonts, and stylesheets with LRU eviction
- **Flexible Output**:
  - **Multi Mode**: Generates individual PDF files for each record (for
    emailing)
  - **Single Mode**: Combines all records into a single PDF (for print/archive)
- **Dynamic Charts**: Embed data-driven charts using Chart.js.
- **Asset Management**: Automatic handling of relative paths for images and
  fonts.
- **High Concurrency**: Parallel processing with ~20-25 pages/sec throughput.
- **GPU Acceleration**: Hardware-accelerated canvas and rasterization.
- **Premium Templates**: Invoice, Bank Statement, Portfolio Report, Insurance
  Policy Statement.

## Quick Start

1. **Generate Sample Data**:

   ```bash
   deno task gen_data
   ```

   This creates `./inp/bank_statements_1000.xml`.

2. **Run the Engine**:

   ```bash
   deno task compose --input ./inp/bank_statements_1000.xml \
     --template ./templates/statement.html --outDir ./out --mode multi
   ```

## Available Templates

| Template         | Description                          | Generator                     |
| ---------------- | ------------------------------------ | ----------------------------- |
| Bank Statement   | Multi-page financial statement       | `deno task gen_data`          |
| Invoice          | Professional invoice with line items | `deno task gen_invoices 50`   |
| Insurance Policy | Auto/Home/Life with dynamic sections | `deno task gen_insurance 100` |
| Portfolio Report | Financial portfolio with charts      | `deno task gen_portfolio`     |

## Usage Guide

### Basic Usage

The core command is `deno task compose`. By default, it looks for input in
`./inp` and templates in `./templates`.

```bash
deno task compose --input <path-to-xml-or-json> --template <path-to-html> --outDir <output-dir>
```

### Output Modes

- **Multi (Default)**: Creates one PDF per record. Best for digital
  distribution.

  ```bash
  --mode multi --outName "Statement_{id}.pdf"
  ```

- **Single**: Creates one PDF with all records. Best for printing.

  ```bash
  --mode single
  ```

### Streaming (Large Files)

For very large files (>100MB), use the `--streamTag` flag. This reads the file
chunk-by-chunk, keeping memory usage low.

```bash
# Process a 1GB file without memory issues
deno task compose --input huge_data.xml --streamTag BankStatement --mode multi
```

### JSON Input

The engine auto-detects JSON files by extension:

```bash
deno task compose --input ./inp/data.json --template ./templates/report.html --outDir ./out
```

### Insurance Template Example

```bash
# Generate 100 insurance policy statements
deno task gen_insurance 100

# Compose PDFs with streaming
deno task compose \
  --input ./inp/insurance_100.xml \
  --template ./templates/insurance_policy.html \
  --outDir ./out/insurance \
  --mode multi \
  --streamTag PolicyStatement \
  --concurrency 8 \
  --verbose
```

### Kitchen Sink Example (Invoice)

```powershell
deno task compose `
  --input ./inp/monthly_data.xml `
  --template ./templates/invoice.html `
  --outDir ./out/invoices `
  --outName "Invoice_{id}_{index}.pdf" `
  --mode multi `
  --concurrency 4 `
  --streamTag InvoiceRecord `
  --recordPath Invoices.InvoiceRecord `
  --headerTemplate ./templates/header.html `
  --footerTemplate ./templates/footer.html `
  --css ./templates/assets/invoice.css `
  --logLevel debug `
  --limit 50
```

## Configuration Reference

| Flag               | Description                                         | Default       |
| :----------------- | :-------------------------------------------------- | :------------ |
| `--input`          | Path to the XML/JSON input file                     | Required      |
| `--template`       | Path to the HTML template file                      | Required      |
| `--headerTemplate` | Path to the HTML header template                    | —             |
| `--footerTemplate` | Path to the HTML footer template                    | —             |
| `--outDir`         | Directory where PDFs will be saved                  | `./out`       |
| `--outName`        | Pattern for output files (`{index}`, `{id}`)        | `{index}.pdf` |
| `--mode`           | `multi` (one PDF per record) or `single` (combined) | `multi`       |
| `--streamTag`      | XML tag for streaming (enables low-memory mode)     | Auto-detect   |
| `--recordPath`     | Dot-notation path to records (e.g., `Root.Rows`)    | Auto-detect   |
| `--concurrency`    | Number of parallel workers (browser tabs)           | CPU cores     |
| `--css`            | Path to an external CSS file to inject              | —             |
| `--chrome`         | Path to the Chrome/Edge executable                  | Auto-detect   |
| `--limit`          | Stop after processing N records (for testing)       | All           |
| `--logLevel`       | `quiet`, `info`, or `debug`                         | `info`        |
| `--skipPageCount`  | Skip page counting (+30-40% faster)                 | `false`       |
| `--totalRecords`   | Expected record count for progress bar              | Auto-detect   |
| `--json`           | Output job results as JSON for scripting            | `false`       |
| `--verbose` / `-v` | Show additional details (cache stats, mode)         | `false`       |
| `--dryRun`         | Validate template and data without generating PDFs  | `false`       |

## Handlebars Helpers

| Helper                      | Example                                   | Description                 |
| --------------------------- | ----------------------------------------- | --------------------------- |
| `formatCurrency`            | `{{formatCurrency amount "USD" "en-US"}}` | Currency formatting         |
| `formatDate`                | `{{formatDate date "MMM dd, yyyy"}}`      | Date formatting             |
| `formatNumber`              | `{{formatNumber value 2}}`                | Number with decimals        |
| `eq`                        | `{{#if (eq a b)}}`                        | Equality (subexpression)    |
| `ifEq`                      | `{{#ifEq status "Active"}}...{{/ifEq}}`   | Equality block              |
| `ifGt`                      | `{{#ifGt score 70}}...{{/ifGt}}`          | Greater-than block          |
| `gt` / `lt` / `gte` / `lte` | `{{#if (gt a b)}}`                        | Comparisons                 |
| `and` / `or` / `not`        | `{{#if (and a b)}}`                       | Logical operators           |
| `lowercase` / `uppercase`   | `{{lowercase text}}`                      | Case conversion             |
| `json`                      | `{{json object}}`                         | Embed as JSON (for scripts) |

## Performance

The Composition Engine is optimized for high-throughput PDF generation:

| Metric          | Value                                      |
| --------------- | ------------------------------------------ |
| **Throughput**  | 20-25 pages/sec (typical templates)        |
| **Peak**        | 30+ pages/sec (simple templates, 8+ cores) |
| **Concurrency** | Auto-tuned to CPU cores                    |
| **Memory**      | Bounded with backpressure control          |
| **Startup**     | <500ms with pre-warmed browser pool        |

### Performance Resources

- 📖 [Performance Tuning Guide](docs/PERFORMANCE.md) — Optimization tips
- 📊 [Performance Metrics](docs/METRICS.md) — Baseline measurements
- 🔬 [Benchmark Suite](benchmark/) — Systematic testing

### Quick Wins

```bash
# 30-40% faster - skip page counting
deno task compose --input data.xml --template tpl.html --outDir ./out --skipPageCount

# Lower memory - use streaming for large files
deno task compose --input data.xml --template tpl.html --outDir ./out --streamTag Record

# Machine-readable output for scripting
deno task compose --input data.xml --template tpl.html --outDir ./out --json
```

## Troubleshooting

| Error                              | Solution                               |
| ---------------------------------- | -------------------------------------- |
| "Failed to find chrome executable" | Install Chrome or use `--chrome /path` |
| "Buffer exceeds maximum length"    | Use `--streamTag` for streaming mode   |
| Empty tables in PDFs               | Ensure nested XML elements are arrays  |
| Browser crashes                    | Reduce `--concurrency` or add memory   |

### Debug Logging

```bash
deno task compose --input data.xml --template tpl.html --outDir ./out --logLevel debug
```

## Project Structure

```
composition-engine/
├── src/
│   ├── cli.ts              # CLI entry point
│   ├── core/engine.ts      # Core composition logic
│   ├── services/           # Browser pool, template, PDF
│   ├── generators/         # Test data generators
│   └── utils/              # XML parser, helpers
├── templates/              # HTML templates
├── inp/                    # Input data files
├── out/                    # Generated PDFs
└── docs/                   # Documentation
```

## Contributing

Contributions are welcome! See [BACKLOG.md](BACKLOG.md) for the roadmap and open
items. Please feel free to submit a Pull Request or open an issue for
discussion.

---

**License:** MIT
