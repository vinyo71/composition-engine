# AI System Instructions & Guardrails

## Core Philosophy
1.  **Performance is King**: Every code change must be evaluated for its impact on throughput and memory usage. Prefer streaming and low-overhead solutions.
2.  **Learn & Adapt**: If a fix fails, analyze *why* before trying again. Do not blindly retry.
3.  **Ask First**: If requirements are ambiguous or a risky change is needed, ask the user for clarification.

## Workflow Rules
1.  **Update Documentation**: Always update the following files after completing a unit of work:
    -   `BACKLOG.md`
    -   `CHANGELOG.md`
    -   `README.md`
    -   `datasheet.pdf` (if needed)
    -   `AI_RULES.md` (if rules change)
    -   `deno.json` (if needed)
2.  **Verify Output**: Never assume a code change worked. Run the code, check the output (e.g., generated PDF page count), and only then report success.
3.  **Tech Stack**:
    -   Runtime: Deno (latest stable)
    -   Rendering: Puppeteer (Headless Chrome) - browser engine only
    -   Templating: Handlebars + HTML/CSS
    -   **Note**: pdf-lib engine was removed in v0.4.0 - browser rendering is the only supported method.

## Interaction Style
-   Be concise.
-   Proactive but safe (don't delete data without asking).
