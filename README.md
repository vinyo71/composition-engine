# composition-engine

Summary
- Parses XML, extracts records, and produces high-fidelity PDFs from HTML templates at scale.
- Default rendering engine uses a headless browser (Puppeteer) for full HTML+CSS support.
- A legacy text-only engine (`pdf-lib`) is available but deprecated.

Features
- Record detection from XML (auto or via --recordPath).
- Two modes:
  - multi: one PDF per record (concurrent)
  - single: one combined PDF
- Concurrency control with --concurrency.
- Output naming pattern supports {index} and {id}.
- Unicode support via user-supplied TTF/OTF font (--font) for the deprecated pdf-lib engine.
- Streaming mode for very large XMLs via --streamTag (no full-file load).
- Full HTML+CSS layout is the default.
- External CSS styling with the --css flag.

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
- You need a local Chrome/Chromium/Edge executable or set PUPPETEER_EXECUTABLE_PATH.
- Multi-PDF (one file per record), auto-detect records (PowerShell):
```
deno task compose --input .\inp\bank_statements_1000.xml --template .\templates\statement.html --outDir .\out --mode multi --concurrency 8
```
- Single combined PDF (PowerShell):
```
deno task compose --input .\inp\bank_statements_1000.xml --template .\templates\statement.html --outDir .\out --mode single
```
- Recommended: pass the executable via --chrome.
  - Windows (Chrome):
    ```
    deno task compose --chrome "C:\Program Files\Google\Chrome\Application\chrome.exe" --input .\inp\bank_statements_1000.xml --template .\templates\statement.html --outDir .\out --mode single
    ```
  - Windows (Edge):
    ```
    deno task compose --chrome "C:\Program Files\Microsoft\Edge\Application\msedge.exe" --input .\inp\bank_statements_1000.xml --template .\templates\statement.html --outDir .\out --mode multi
    ```
  - Linux:
    ```
    deno task compose --chrome /usr/bin/google-chrome --input ./inp/bank_statements_1000.xml --template ./templates/statement.html --outDir ./out --mode multi
    ```
  - macOS:
    ```
    deno task compose --chrome "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --input ./inp/bank_statements_1000.xml --template ./templates/statement.html --outDir ./out --mode single
    ```
- Alternatively set env var:
  - PowerShell:
    ```
    $env:PUPPETEER_EXECUTABLE_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"
    deno task compose ...
    ```
  - Bash:
    ```
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome deno task compose ...
    ```

Large XMLs (streaming)
- Process huge files without loading them fully:
  - Multi (browser, default):
    ```
    deno task compose --input .\inp\bank_statements_1000000.xml --template .\templates\statement.html --outDir .\out --mode multi --concurrency 4 --streamTag BankStatement
    ```
  - Multi (pdf-lib, deprecated):
    ```
    deno task compose --engine pdf-lib --input .\inp\bank_statements_1000000.xml --template .\templates\statement.html --outDir .\out --mode multi --concurrency 8 --streamTag BankStatement
    ```
  - Single (pdf-lib only; browser single + streaming is not supported)

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
- --input : XML input (default: ./inp/bank_statements_1000.xml)
- --template : template file (default: ./templates/statement.html)
- --outDir <dir>: output directory (default: ./out)
- --outName <pattern>: output name pattern (default: {index}.pdf; supports {index}, {id})
- --mode <multi|single>: output mode (default: multi)
- --format <pdf>: output format (pdf only)
- --recordPath <path>: explicit path to record array (dot-notation)
- --concurrency <n>: workers for multi mode (default: CPU cores)
- --limit <n>: process only first N records
- --font <path>: TTF/OTF font path for Unicode text (deprecated pdf-lib engine)
- --engine <browser|pdf-lib>: choose rendering engine (default: browser)
- --streamTag <tag>: stream repeating elements by tag (e.g., BankStatement) to avoid full-file loads
- --css <file>: inject external CSS file for browser engine
- --logLevel <quiet|info|debug>: Controls the verbosity of console output (default: info)

Fonts and Unicode
- The default `browser` engine uses system fonts via Chromium; typically no extra font config is needed.
- The deprecated `pdf-lib` engine requires a Unicode TTF/OTF via --font for non-ASCII (e.g., Hungarian “ő/ű”).

Trade-offs
- `browser` engine (default): full HTML/CSS fidelity, slower and heavier (Chromium startup and rendering).
- `pdf-lib` engine (deprecated): fastest, simplest layout (text-only).

Performance and Logging
- **Timing Summary**: At the end of execution, a detailed timing summary is displayed (unless `--logLevel quiet` is used), breaking down time spent in setup, XML loading, XML parsing, and PDF processing. Throughput metrics (records per second) are also provided.
- **Memory Guardrail**: When using `--mode single` with a large number of records, a warning will be issued, advising to switch to `--mode multi` or `--streamTag` to reduce memory consumption.
- **Puppeteer Timeout**: The internal timeout for Puppeteer operations has been increased to better handle large single-PDF generation tasks.
- **--logLevel <quiet|info|debug>**: Controls the verbosity of console output.
  - `quiet`: Suppresses most informational messages, including the timing summary.
  - `info` (default): Shows progress updates and the timing summary.
  - `debug`: Shows detailed debugging information.

Troubleshooting
- **failed to find chrome executable**:
  - Make sure you have Google Chrome, Chromium, or MS Edge installed.
  - If installed in a non-standard location, provide the path via `--chrome <path/to/exe>`
  - Alternatively, set the `PUPPETEER_EXECUTABLE_PATH` environment variable.
- **failed to allocate string; buffer exceeds maximum length**:
  - Use --streamTag to enable streaming.
  - Prefer --mode multi for massive datasets.
- **WinAnsi cannot encode "..."**:
  - This is a `pdf-lib` engine error. Use `--font` with the deprecated engine, or switch to the default `--engine browser` for full Unicode with system fonts.
