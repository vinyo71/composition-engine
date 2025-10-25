# composition-engine

Summary
- Parses XML, extracts records, and produces PDFs at scale.
- Two rendering engines:
  - pdf-lib: high-throughput text layout (default)
  - browser: full HTML+CSS layout via headless Chromium (Puppeteer)

Features
- Record detection from XML (auto or via --recordPath).
- Two modes:
  - multi: one PDF per record (concurrent)
  - single: one combined PDF
- Concurrency control with --concurrency.
- Output naming pattern supports {index} and {id}.
- Unicode support via user-supplied TTF/OTF font (--font) for pdf-lib.
- Streaming mode for very large XMLs via --streamTag (no full-file load).
- Full HTML+CSS layout with --engine=browser.

User Docs

Requirements
- Deno installed
- Python available as py (for sample data generation)

Generate data
```
deno task gen_data
```
- The generated XML will be saved under `./inp/` (e.g., `./inp/bank_statements_1000.xml`).

Quick start (pdf-lib, default)
- Multi-PDF (one file per record), auto-detect records (PowerShell):
```
deno task compose --input .\inp\bank_statements_1000.xml --template .\templates\statement.html --outDir .\out --mode multi --concurrency 8
```
- Single combined PDF (PowerShell):
```
deno task compose --input .\inp\bank_statements_1000.xml --template .\templates\statement.html --outDir .\out --mode single
```

HTML+CSS layout (Chromium)
- You need a local Chrome/Chromium/Edge executable or set PUPPETEER_EXECUTABLE_PATH.
- Recommended: pass the executable via --chrome.
  - Windows (Chrome):
    ```
    deno task compose --engine browser --chrome "C:\Program Files\Google\Chrome\Application\chrome.exe" --input .\inp\bank_statements_1000.xml --template .\templates\statement.html --outDir .\out --mode single
    ```
  - Windows (Edge):
    ```
    deno task compose --engine browser --chrome "C:\Program Files\Microsoft\Edge\Application\msedge.exe" --input .\inp\bank_statements_1000.xml --template .\templates\statement.html --outDir .\out --mode multi
    ```
  - Linux:
    ```
    deno task compose --engine browser --chrome /usr/bin/google-chrome --input ./inp/bank_statements_1000.xml --template ./templates/statement.html --outDir ./out --mode multi
    ```
  - macOS:
    ```
    deno task compose --engine browser --chrome "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --input ./inp/bank_statements_1000.xml --template ./templates/statement.html --outDir ./out --mode single
    ```
- Alternatively set env var:
  - PowerShell:
    ```
    $env:PUPPETEER_EXECUTABLE_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"
    deno task compose --engine browser ...
    ```
  - Bash:
    ```
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome deno task compose --engine browser ...
    ```

Large XMLs (streaming)
- Process huge files without loading them fully:
  - Multi (pdf-lib):
    ```
    deno task compose --input .\inp\bank_statements_1000000.xml --template .\templates\statement.html --outDir .\out --mode multi --concurrency 8 --streamTag BankStatement
    ```
  - Multi (browser):
    ```
    deno task compose --engine browser --input .\inp\bank_statements_1000000.xml --template .\templates\statement.html --outDir .\out --mode multi --concurrency 4 --streamTag BankStatement
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
- --font <path>: TTF/OTF font path for Unicode text (pdf-lib engine)
- --engine <pdf-lib|browser>: choose rendering engine
- --streamTag <tag>: stream repeating elements by tag (e.g., BankStatement) to avoid full-file loads

Fonts and Unicode
- pdf-lib engine: provide a Unicode TTF/OTF via --font for non-ASCII (e.g., Hungarian “ő/ű”).
- browser engine: uses system fonts via Chromium; typically no extra font config needed.

Trade-offs
- pdf-lib engine: fastest, simplest layout (text-only).
- browser engine: full HTML/CSS fidelity, slower and heavier (Chromium startup and rendering).

Troubleshooting
- failed to allocate string; buffer exceeds maximum length:
  - Use --streamTag to enable streaming.
  - Prefer --mode multi for massive datasets.
- WinAnsi cannot encode "...":
  - Use --font with pdf-lib engine, or switch to --engine browser for full Unicode with system fonts.
