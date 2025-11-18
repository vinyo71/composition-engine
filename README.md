# Composition Engine

![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)

**High-performance, high-fidelity document generation at scale.**

The Composition Engine bridges the gap between raw data (XML) and professional documents (PDF). It is designed to process massive datasets efficiently, producing pixel-perfect documents using HTML templates and headless browser rendering.

## Features

*   **High Fidelity**: Uses a headless browser (Puppeteer) to render full HTML/CSS, ensuring your PDFs look exactly like your web templates.
*   **Handlebars Templates**: Full support for logic (`{{#if}}`, `{{#each}}`) and formatting helpers (`formatCurrency`, `formatDate`).
*   **Scalable Streaming**: Processes gigabyte-sized XML files with millions of records without loading the entire file into memory.
*   **Flexible Output**:
    *   **Multi Mode**: Generates individual PDF files for each record (e.g., for emailing).
    *   **Single Mode**: Combines all records into a single PDF (e.g., for archival or print).
*   **Concurrency**: Parallel processing to maximize CPU usage and throughput.

## Requirements

*   **Deno**: [Install Deno](https://deno.land/#installation)
*   **Chrome/Edge**: A local installation of Google Chrome, Chromium, or Microsoft Edge.

## Quick Start

1.  **Generate Sample Data**:
    ```bash
    deno task gen_data
    ```
    This creates `./inp/bank_statements_1000.xml`.

2.  **Run the Engine**:
    ```bash
    deno task compose --input ./inp/bank_statements_1000.xml --template ./templates/statement.html --outDir ./out --mode multi
    ```

## Usage Guide

### Basic Usage
The core command is `deno task compose`. By default, it looks for input in `./inp` and templates in `./templates`.

```bash
deno task compose --input <path-to-xml> --template <path-to-html> --outDir <output-dir>
```

### Output Modes
*   **Multi (Default)**: Creates one PDF per record. Best for digital distribution.
    ```bash
    --mode multi --outName "Statement_{id}.pdf"
    ```
*   **Single**: Creates one giant PDF containing all records, separated by page breaks. Best for printing.
    ```bash
    --mode single
    ```

### Streaming (Large Files)
For very large XML files (e.g., >100MB), use the `--streamTag` flag. This tells the engine to read the file chunk-by-chunk, keeping memory usage low.

```bash
# Process a 1GB file without crashing memory
deno task compose --input huge_data.xml --streamTag BankStatement --mode multi
```

### Styling
You can inject an external CSS file to style your templates. This is useful for sharing styles across multiple templates.

```bash
deno task compose --css ./styles/main.css ...
```

### Comprehensive Example ("Kitchen Sink")
Here is an example using the advanced invoice dataset.

First, generate the invoice data:
```bash
deno task gen_invoices 50
```

Then run the composition engine:
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
  --css ./assets/invoice.css `
  --logLevel debug `
  --limit 50
```

## Configuration Reference

| Flag | Description | Default |
| :--- | :--- | :--- |
| `--input` | Path to the XML input file. | `./inp/bank_statements_1000.xml` |
| `--template` | Path to the HTML template file. | `./templates/statement.html` |
| `--headerTemplate` | Path to the HTML header template. | `undefined` |
| `--footerTemplate` | Path to the HTML footer template. | `undefined` |
| `--outDir` | Directory where PDFs will be saved. | `./out` |
| `--outName` | Pattern for naming output files. Supports `{index}` and `{id}`. | `{index}.pdf` |
| `--mode` | `multi` (one PDF per record) or `single` (one combined PDF). | `multi` |
| `--streamTag` | XML tag name to stream (e.g., `Invoice`). Enables low-memory processing. | `undefined` |
| `--recordPath` | Dot-notation path to the array of records in the XML (e.g., `Root.Rows`). | Auto-detected |
| `--concurrency` | Number of parallel workers (browser tabs). | CPU Core Count |
| `--css` | Path to an external CSS file to inject. | `undefined` |
| `--chrome` | Path to the Chrome/Edge executable. | Auto-detected |
| `--limit` | Stop after processing N records. Useful for testing. | `undefined` |
| `--logLevel` | `quiet`, `info`, or `debug`. | `info` |
| `--engine` | `browser` (recommended) or `pdf-lib` (deprecated text-only). | `browser` |

## Advanced Topics

### Performance & Logging
The engine provides a detailed timing summary at the end of execution.
*   Use `--logLevel debug` to see per-record processing details.
*   Use `--concurrency` to tune performance based on your machine's capabilities.

### Troubleshooting
*   **"Failed to find chrome executable"**: Ensure Chrome is installed or provide the path via `--chrome`.
*   **"Buffer exceeds maximum length"**: You are trying to load a huge XML file into memory. Use `--streamTag` to switch to streaming mode.
