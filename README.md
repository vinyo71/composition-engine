# composition-engine

Summary
- Parses XML, extracts records, renders simple text templates, and produces PDFs at scale (via pdf-lib).
- Optimized for throughput; text-only rendering (no CSS/HTML layout).

Features
- Record detection from XML (auto or via --recordPath).
- Two modes:
  - multi: one PDF per record (concurrent)
  - single: one combined PDF
- Concurrency control with --concurrency.
- Output naming pattern supports {index} and {id}.
- Unicode support via user-supplied TTF/OTF font (--font), with auto-discovery and safe fallback.
- Streaming mode for very large XMLs via --streamTag (no full-file load).

User Docs

Requirements
- Deno installed
- Python available as py (for sample data generation)

Generate data
```
deno task gen_data
```
- The generated XML will be saved under `./inp/` (e.g., `./inp/bank_statements_1000.xml`).

Quick start
- Multi-PDF (one file per record), auto-detect records (PowerShell):
```
deno task compose --input .\inp\bank_statements_1000.xml --template .\templates\statement.html --outDir .\out --mode multi --concurrency 8
```
- Single combined PDF (PowerShell):
```
deno task compose --input .\inp\bank_statements_1000.xml --template .\templates\statement.html --outDir .\out --mode single
```

Large XMLs (streaming)
- Process huge files without loading them fully:
  - Multi (recommended for very large datasets):
    ```
    deno task compose --input .\inp\bank_statements_1000000.xml --template .\templates\statement.html --outDir .\out --mode multi --concurrency 8 --streamTag BankStatement
    ```
  - Single (memory heavy due to one PDF; use with caution):
    ```
    deno task compose --input .\inp\bank_statements_1000000.xml --template .\templates\statement.html --outDir .\out --mode single --streamTag BankStatement
    ```

Development
- Watch + strict type-check:
```
deno task dev
```
- Watch + skip type-checks:
```
deno task dev:nocheck
```

Usage (compose)
- Auto-detect records or specify explicitly with --recordPath:
```
--recordPath BankStatements.BankStatement
```
- Verify quickly with your dataset (uses default input at ./inp/bank_statements_1000.xml):
```
deno run -A src/cli.ts --limit 100
```

CLI options
- --input <file>: XML input (default: ./inp/bank_statements_1000.xml)
- --template <file>: template file (default: ./templates/statement.html)
- --outDir <dir>: output directory (default: ./out)
- --outName <pattern>: output name pattern (default: {index}.pdf; supports {index}, {id})
- --mode <multi|single>: output mode (default: multi)
- --format <pdf>: output format (pdf only)
- --recordPath <path>: explicit path to record array (dot-notation)
- --concurrency <n>: workers for multi mode (default: CPU cores)
- --limit <n>: process only first N records
- --font <path>: TTF/OTF font path for Unicode text
- --streamTag <tag>: stream repeating elements by tag (e.g., BankStatement) to avoid full-file loads

Fonts and Unicode
- Provide a Unicode TTF/OTF via --font to render non-ASCII (e.g., Hungarian “ő/ű”).

Troubleshooting
- failed to allocate string; buffer exceeds maximum length:
  - Use --streamTag to enable streaming.
  - Prefer --mode multi for massive datasets.
- WinAnsi cannot encode "...":
  - Provide a Unicode font with --font (see Fonts and Unicode).
