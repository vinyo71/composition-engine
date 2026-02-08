# Pipeline Optimization Plan

**Date:** 2026-02-08\
**Version:** 0.6.1\
**Goal:** Document the current pipeline architecture and optimized pipeline
design with expected improvements.

---

## Overview

This document describes the complete XML→PDF generation pipeline, identifies
bottlenecks, and outlines the optimized architecture targeting **+50-80%
throughput improvement**.

---

## Current Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CURRENT PIPELINE (10-14 pages/sec)                   │
├──────────────┬──────────────┬──────────────┬──────────────┬────────────────┤
│   STAGE 1    │   STAGE 2    │   STAGE 3    │   STAGE 4    │    STAGE 5     │
│   XML Parse  │   Template   │   HTML Wrap  │   Browser    │    File I/O    │
│              │   Compile    │   + Assets   │   Render     │                │
├──────────────┼──────────────┼──────────────┼──────────────┼────────────────┤
│ ~1-5%        │ ~1-2%        │ ~1-2%        │ ~85-95%      │ ~2-5%          │
│ of time      │ of time      │ of time      │ of time      │ of time        │
└──────────────┴──────────────┴──────────────┴──────────────┴────────────────┘
```

**Bottleneck:** Browser rendering consumes 85-95% of processing time.

---

## Current Pipeline Steps

### Startup Phase (1-2 seconds)

| Step | Operation         | Current Implementation            | Issue                 |
| ---- | ----------------- | --------------------------------- | --------------------- |
| 1    | Load Config       | Parse CLI args                    | ✓ OK                  |
| 2    | Read Template     | `Deno.readTextFile()`             | ✓ OK                  |
| 3    | Compile Template  | `Handlebars.compile()` at runtime | ⚠️ Runtime overhead   |
| 4    | Read CSS          | `Deno.readTextFile()`             | ✓ OK                  |
| 5    | Init Browser Pool | Launch Chrome, 0 pages            | ⚠️ Lazy page creation |
| 6    | Create Output Dir | `ensureDir()`                     | ✓ OK                  |

### Processing Phase (per record)

| Step | Operation        | Current Implementation         | Issue                        |
| ---- | ---------------- | ------------------------------ | ---------------------------- |
| 7    | Read/Stream XML  | `streamXmlElements()`          | ✓ OK                         |
| 8    | Parse XML Chunk  | `fast-xml-parser`              | ✓ OK                         |
| 9    | Render Template  | `render(data)`                 | ✓ OK                         |
| 10   | Wrap HTML        | `wrapHtmlDoc()`                | ✓ OK                         |
| 11   | Acquire Page     | Pool acquire                   | ⚠️ Cold start on first pages |
| 12   | Set Interception | `setRequestInterception(true)` | ✓ OK                         |
| 13   | Load HTML        | `page.setContent()`            | ✓ OK                         |
| 14   | Check Cache      | Asset cache lookup             | ✓ OK                         |
| 15   | Inject CSS       | `page.addStyleTag()`           | ✓ OK                         |
| 16   | Generate PDF     | `page.pdf()`                   | ⚠️ Full buffer in memory     |
| 17   | Count Pages      | `PDFDocument.load()`           | ⚠️ Extra parsing             |
| 18   | Write File       | `Deno.writeFile()`             | ⚠️ Sequential blocking       |
| 19   | Remove Handlers  | `page.off()`                   | ✓ OK                         |
| 20   | Release Page     | Reset and return               | ✓ OK                         |

### Cleanup Phase

| Step | Operation    | Current Implementation  |
| ---- | ------------ | ----------------------- |
| 21   | Destroy Pool | Close pages and browser |

---

## Optimized Pipeline Design

### Startup Phase (0.3-0.5 seconds) — 70% faster

| Step | Operation         | Optimization                   | Gain             |
| ---- | ----------------- | ------------------------------ | ---------------- |
| 1    | Load Config       | Unchanged                      | -                |
| 2    | Read Template     | Unchanged                      | -                |
| 3    | Load Template     | **Pre-compiled JS**            | +5-10% render    |
| 4    | Read CSS          | Unchanged                      | -                |
| 5    | Init Browser      | **GPU flags + Pre-warm pages** | -500ms startup   |
| 5b   | Multi-Browser     | **2-4 instances (16+ cores)**  | +30-50% scale    |
| 6    | Create Output Dir | Unchanged                      | -                |
| 7    | Init Write Queue  | **Background writer**          | Non-blocking I/O |

### Processing Phase (per record) — 50-80% faster

| Step | Operation        | Optimization                  | Gain          |
| ---- | ---------------- | ----------------------------- | ------------- |
| 8    | Read/Stream XML  | Unchanged                     | -             |
| 9    | Parse XML Chunk  | Unchanged                     | -             |
| 10   | Render Template  | **Pre-compiled template**     | +5-10%        |
| 11   | Wrap HTML        | Unchanged                     | -             |
| 12   | Acquire Page     | **Instant (pre-warmed)**      | -100ms/record |
| 13   | Set Interception | **Pre-configured**            | -10ms/record  |
| 14   | Load HTML        | **GPU-accelerated**           | +10-20%*      |
| 15   | Check Cache      | **Higher hit rate**           | +5-15%        |
| 16   | Inject CSS       | Unchanged                     | -             |
| 17   | Generate PDF     | **Streaming output** (future) | -30% memory   |
| 18   | Count Pages      | **Disabled by default**       | +30-40%       |
| 19   | Queue Write      | **Non-blocking batch**        | +5-10%        |
| 20   | Remove Handlers  | Unchanged                     | -             |
| 21   | Release Page     | **Minimal reset**             | +2-5%         |

---

## Visual Flow Comparison

### Current: Sequential with Bottlenecks

```
Record 1: [Parse]─[Render]─[Acquire Page]─[Load HTML]─[Generate PDF]─[Write File]─[Release]
                                  ↑                                        ↑
                            COLD START                              BLOCKING I/O
                            500-800ms                                 5-10ms

Record 2:                                    [Parse]─[Render]─[Acquire]─[Load]─[PDF]─[Write]
                                                                           ↑
                                                                    WAITS FOR FILE
```

### Optimized: Maximum Parallelism

```
                    STARTUP: Pre-warm 4 pages (500ms once)
                                    ↓
Record 1: [Parse]─[Render]─[Acquire]─[Load HTML]─[Generate PDF]─[Queue Write]─[Release]
                      ↑ INSTANT                                       ↑ NON-BLOCKING

Record 2:        [Parse]─[Render]─[Acquire]─[Load HTML]─[Generate PDF]─[Queue Write]─[Release]

Record 3:               [Parse]─[Render]─[Acquire]─[Load HTML]─[Generate PDF]─[Queue Write]

Record 4:                      [Parse]─[Render]─[Acquire]─[Load HTML]─[Generate PDF]

                                                              Background: [Flush 10 files]───►
```

---

## Implementation Priority

### Tier 1: Quick Wins (4-8 hours total)

| Optimization             | Expected Gain     | Effort    | File                    |
| ------------------------ | ----------------- | --------- | ----------------------- |
| Browser Pool Pre-warming | -500ms startup    | 2-3 hours | ✅ **Completed v0.6.0** |
| Parallel File I/O        | +5-10% throughput | 2-3 hours | `engine.ts`             |
| GPU Acceleration Flags   | +10-20%*          | 1-2 hours | ✅ **Completed v0.6.0** |

### Tier 2: Medium Term (2-4 days total)

| Optimization            | Expected Gain       | Effort    | File                        |
| ----------------------- | ------------------- | --------- | --------------------------- |
| Playwright Migration    | +5-10%              | 1-2 days  | `pdf.ts`, `browser_pool.ts` |
| Pre-compiled Templates  | +5-10% render       | 4-6 hours | `template.ts`               |
| Multi-Browser Instances | +30-50% (16+ cores) | 4-6 hours | New file                    |
| PDF Streaming Output    | -30% memory         | 6-8 hours | `pdf.ts`                    |

### Tier 3: Advanced (1-2 weeks)

| Optimization           | Expected Gain  | Effort    | Notes                |
| ---------------------- | -------------- | --------- | -------------------- |
| typst Fast-Path        | +500-1000%     | 1-2 weeks | Alternative renderer |
| Distributed Processing | Linear scaling | 1-2 weeks | Multi-machine        |
| Cloud Functions        | Auto-scaling   | 1 week    | Serverless           |

---

## Expected Impact Summary

| Metric                   | Current         | Optimized       | Improvement    |
| ------------------------ | --------------- | --------------- | -------------- |
| **Startup Time**         | 1-2 seconds     | 0.3-0.5 seconds | **-70%**       |
| **First PDF Latency**    | 600-900ms       | 100-200ms       | **-80%**       |
| **Throughput (4-core)**  | 10-14 pages/sec | 15-22 pages/sec | **+50-60%**    |
| **Throughput (16-core)** | 14-16 pages/sec | 25-35 pages/sec | **+100%**      |
| **Memory (Streaming)**   | 500-700 MB      | 350-500 MB      | **-30%**       |
| **File I/O Blocking**    | Yes             | No              | **Eliminated** |

---

## Code Snippets

### Browser Pool Pre-warming

```typescript
// browser_pool.ts
async initialize() {
    this.browser = await this.createBrowser();
    // Pre-warm all pages
    const warmup = [];
    for (let i = 0; i < this.maxSize; i++) {
        warmup.push(this.browser.newPage().then(p => this.pages.push(p)));
    }
    await Promise.all(warmup);
    this.logger.info(`Pre-warmed ${this.maxSize} pages`);
}
```

### GPU Acceleration Flags

```typescript
// browser_pool.ts
private async createBrowser(): Promise<Browser> {
    return await launch({
        headless: "new",
        executablePath: this.chromePath,
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--enable-gpu-rasterization",      // NEW
            "--enable-accelerated-2d-canvas",  // NEW
            "--ignore-gpu-blocklist",          // NEW
        ],
    });
}
```

### Parallel File I/O Queue

```typescript
// utils/write_queue.ts
class WriteQueue {
  private queue: { path: string; bytes: Uint8Array }[] = [];

  enqueue(path: string, bytes: Uint8Array) {
    this.queue.push({ path, bytes });
    if (this.queue.length >= 10) this.flush();
  }

  async flush() {
    const batch = this.queue.splice(0, 10);
    await Promise.all(
      batch.map(({ path, bytes }) => Deno.writeFile(path, bytes)),
    );
  }
}
```

---

## Related Documentation

- [Performance Tuning Guide](./PERFORMANCE.md)
- [Performance Metrics](./METRICS.md)
- [Cluster Evaluation](./CLUSTER_EVALUATION.md)

---

## Version History

| Version | Date       | Changes                                             |
| ------- | ---------- | --------------------------------------------------- |
| 1.1     | 2026-02-08 | Updated to v0.6.1, marked Tier 1 items as completed |
| 1.0     | 2026-01-25 | Initial pipeline optimization plan                  |
