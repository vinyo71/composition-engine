# Performance Tuning Guide

This guide helps you optimize the Composition Engine for maximum throughput and efficiency.

## Table of Contents
- [Hardware Requirements](#hardware-requirements)
- [Concurrency Tuning](#concurrency-tuning)
- [Memory Management](#memory-management)
- [Template Optimization](#template-optimization)
- [Asset Caching](#asset-caching)
- [Browser Configuration](#browser-configuration)
- [Troubleshooting](#troubleshooting)

## Hardware Requirements

### Minimum Requirements
- **CPU:** 2 cores
- **RAM:** 4GB
- **Storage:** 100MB + space for outputs
- **Chrome/Chromium:** Installed and accessible

### Recommended for Production
- **CPU:** 4+ cores (8+ for high volume)
- **RAM:** 8GB+ (16GB+ for high volume)
- **Storage:** SSD for faster I/O
- **Chrome Headless Shell:** Installed for optimal performance

### Scaling Guidelines

| Throughput Target | CPU Cores | RAM | Concurrency | Notes |
|-------------------|-----------|-----|-------------|-------|
| 5-10 pages/sec | 2-4 | 4-8GB | 2-4 | Development/testing |
| 10-20 pages/sec | 4-8 | 8-16GB | 4-8 | Small production |
| 20-50+ pages/sec | 8-16+ | 16-32GB+ | 8-16+ | High-volume production |

## Concurrency Tuning

### Understanding Concurrency

The `--concurrency` option controls how many PDFs are generated in parallel. Higher concurrency increases throughput but also memory usage.

### Default Setting
```bash
# Auto-detected based on CPU cores
concurrency = Math.max(1, navigator.hardwareConcurrency ?? 4)
```

### Manual Tuning

**Conservative (Memory-Constrained):**
```bash
deno task compose --input data.xml --template tpl.html \
  --outDir ./out --concurrency 2
```

**Balanced (Recommended):**
```bash
# Use CPU core count
deno task compose --input data.xml --template tpl.html \
  --outDir ./out --concurrency 4
```

**Aggressive (High-Memory Systems):**
```bash
# 2x CPU cores
deno task compose --input data.xml --template tpl.html \
  --outDir ./out --concurrency 8
```

### Finding Your Optimal Concurrency

Run benchmarks with different values:

```bash
# Test with concurrency 2, 4, 8
for c in 2 4 8; do
  echo "Testing concurrency=$c"
  deno task compose --input test.xml --template tpl.html \
    --outDir ./out/test_$c --concurrency $c
done
```

Monitor:
- **Throughput** (pages/sec) - should increase with concurrency
- **Memory usage** - should stay under available RAM
- **CPU usage** - should reach 80-100%

**Optimal concurrency:** Highest value where throughput still increases and memory stays stable.

## Memory Management

### Backpressure Control

The engine uses a semaphore to limit in-flight tasks:
```typescript
// Permits = concurrency * 2
const semaphore = new Semaphore(opts.concurrency * 2);
```

This prevents unbounded queue growth while keeping the pipeline full.

### Memory Optimization Tips

**1. Use Streaming Mode**
```bash
# Processes records as they're parsed
deno task compose --input data.xml --template tpl.html \
  --outDir ./out --streamTag Record
```

**2. Skip Page Counting (30-40% faster)**
```bash
# Avoid loading PDFs with pdf-lib for page counting
deno task compose --input data.xml --template tpl.html \
  --outDir ./out --skipPageCount
```

**3. Batch vs Streaming**
- **Batch mode:** Loads entire XML into memory (fast for small files)
- **Streaming mode:** Processes incrementally (required for large files)

**Rule of thumb:** Use streaming for files > 100MB

### Monitoring Memory

**Windows:**
```powershell
# Monitor Deno process
Get-Process deno | Select-Object CPU,PM,WS
```

**Linux/Mac:**
```bash
# Monitor memory usage
top -p $(pgrep deno)
```

## Template Optimization

### Template Complexity Impact

| Template Type | Pages/Record | Throughput Impact | Memory Impact |
|---------------|--------------|-------------------|---------------|
| Simple text | 1-2 | Baseline | Low |
| Styled document | 2-5 | -10-20% | Medium |
| Heavy (charts/images) | 5-10+ | -30-50% | High |

### Optimization Techniques

**1. Minimize DOM Complexity**
```html
<!-- Avoid -->
<div><div><div><span>Text</span></div></div></div>

<!-- Prefer -->
<p>Text</p>
```

**2. Optimize CSS**
```css
/* Avoid expensive selectors */
div > div > div { ... }

/* Prefer */
.className { ... }
```

**3. Lazy-Load Images**
```html
<!-- Use data URIs for small images -->
<img src="data:image/png;base64,..." />

<!-- Or ensure images are cached (see Asset Caching) -->
```

**4. Limit Chart Complexity**
```javascript
// Reduce data points for charts
const data = largeDataset.filter((_, i) => i % 10 === 0);
```

**5. Use `page-break-inside: avoid`**
```css
/* Prevent awkward page breaks */
.record {
  page-break-inside: avoid;
}
```

## Asset Caching

The engine caches images, fonts, and stylesheets (v0.4.0+).

### How It Works
```typescript
// 50MB cache, automatic eviction
const globalAssetCache = new AssetCache(50);
```

### Cache Benefits
- **Fonts:** Cached once, reused across all PDFs
- **Images:** Logos/icons loaded once
- **Stylesheets:** External CSS cached

### Best Practices

**1. Use Relative Paths**
```html
<!-- Template at templates/invoice.html -->
<img src="./assets/logo.png" />
<link rel="stylesheet" href="./assets/style.css" />
```

**2. Reuse Assets Across Templates**
```
templates/
  assets/
    logo.png        # Shared logo
    fonts/
      inter.woff2   # Shared font
  invoice.html
  statement.html
```

**3. Optimize Asset Sizes**
- **Images:** Use WebP or optimized PNG/JPG
- **Fonts:** Use WOFF2, subset if possible
- **CSS:** Minify external stylesheets

### Cache Statistics

Access cache stats programmatically:
```typescript
import { getAssetCacheStats } from "./src/services/pdf.ts";

const stats = getAssetCacheStats();
console.log(stats);
// { hits: 450, misses: 50, cacheSize: 12, cacheMB: "2.34", hitRate: "90.0" }
```

## Browser Configuration

### Chrome Headless Shell vs Full Chrome

**Chrome Headless Shell** (Recommended):
- 50% faster startup
- 60% less memory
- Optimized for headless usage
- Auto-detected with fallback

**Installation:**

Windows:
```powershell
# Usually bundled with Chrome or Puppeteer
# Check: C:\Program Files\Google\Chrome\Application\chrome-headless-shell.exe
```

Linux:
```bash
# Ubuntu/Debian
sudo apt install google-chrome-headless-shell

# Or via Puppeteer
npm install puppeteer  # Downloads chromium-headless
```

### Custom Chrome Path

Override auto-detection:
```bash
deno task compose --input data.xml--template tpl.html \
  --outDir ./out \
  --chrome "C:\path\to\chrome-headless-shell.exe"
```

### Environment Variable
```bash
export PUPPETEER_EXECUTABLE_PATH=/usr/bin/chrome-headless-shell
deno task compose --input data.xml --template tpl.html --outDir ./out
```

## Troubleshooting

### Low Throughput

**Symptom:** Pages/sec well below expected

**Checklist:**
1. ✅ Check CPU usage - should be 80-100%
2. ✅ Increase `--concurrency` if CPU is underutilized
3. ✅ Use `--skipPageCount` to skip PDF parsing
4. ✅ Ensure Chrome Headless Shell is installed
5. ✅ Simplify template (remove heavy assets/charts)
6. ✅ Check I/O - use SSD if possible

**Example:**
```bash
# Before: 5 pages/sec with concurrency=2
# After: 11 pages/sec with concurrency=4 --skipPageCount
```

### High Memory Usage

**Symptom:** Memory grows unbounded or crashes

**Checklist:**
1. ✅ Use streaming mode for large files (`--streamTag`)
2. ✅ Reduce `--concurrency`
3. ✅ Use `--skipPageCount` (avoids loading PDFs)
4. ✅ Check for memory leaks in custom templates
5. ✅ Limit `--limit` for testing

**Example:**
```bash
# Streaming + lower concurrency
deno task compose --input huge.xml --template tpl.html \
  --outDir ./out --streamTag Record --concurrency 2
```

### Browser Crashes

**Symptom:** "ConnectionClosedError" or browser timeouts

**Checklist:**
1. ✅ Reduce `--concurrency` (browser pool exhaustion)
2. ✅ Increase system memory allocation
3. ✅ Check template for infinite loops
4. ✅ Verify Chrome/Chromium is installed correctly
5. ✅ Try different Chrome executable

**Example:**
```bash
# Conservative settings
deno task compose --input data.xml --template tpl.html \
  --outDir ./out --concurrency 2 --limit 100
```

### Slow Startup

**Symptom:** Long delay before first PDF

**Solutions:**
1. ✅ Install Chrome Headless Shell (50% faster startup)
2. ✅ Warm up browser pool (already done automatically)
3. ✅ Use SSD for faster Chrome launch

### Asset Loading Failures

**Symptom:** Missing images/fonts in PDFs

**Checklist:**
1. ✅ Use relative paths in templates
2. ✅ Verify `<base href="${baseUrl}">` is injected
3. ✅ Check asset paths are correct
4. ✅ Ensure assets are accessible (not blocked by permissions)

**Debug:**
```bash
# Enable debug logging
deno task compose --input data.xml --template tpl.html \
  --outDir ./out --logLevel debug
```

## Performance Benchmarks

### Baseline (v0.4.0)

Hardware: 4-core CPU, 16GB RAM, SSD

| Template | Records | Concurrency | Pages/sec | Notes |
|----------|---------|-------------|-----------|-------|
| Simple (1 page) | 1000 | 4 | 10-12 | Text only |
| Medium (3 pages) | 1000 | 4 | 8-10 | Styled |
| Heavy (5+ pages) | 1000 | 4 | 5-7 | Charts/images |

### Optimization Impact

| Optimization | Throughput Gain | Memory Impact |
|--------------|-----------------|---------------|
| `--skipPageCount` | +30-40% | Neutral |
| Headless Shell | +10-20% | -60% memory |
| Asset Caching | +5-15% | +Cache size |
| Streaming | 0% | -70% memory |

### Real-World Example

**Before optimization:**
```bash
Input: 5000 bank statements (3 pages each)
Concurrency: 2
Time: ~25 minutes
Throughput: 6 pages/sec
Memory: 3.5GB peak
```

**After optimization:**
```bash
Input: 5000 bank statements (3 pages each)  
Concurrency: 4
Flags: --skipPageCount --streamTag BankStatement
Chrome: headless-shell
Time: ~12 minutes
Throughput: 12.5 pages/sec
Memory: 1.2GB peak
```

**Result:** 2x faster, 3x less memory

## Summary: Quick Wins

1. **Use `--skipPageCount`** - 30-40% faster
2. **Install Chrome Headless Shell** - 10-20% faster, 60% less memory
3. **Tune concurrency** - Match your CPU cores (or 2x for high-memory systems)
4. **Use streaming for large files** - Prevents memory issues
5. **Optimize templates** - Simpler DOM = faster rendering
6. **Reuse assets** - Leverage asset caching

## Next Steps

- Run [benchmark suite](file:///c:/dev/composition-engine/benchmark/run_benchmark.ts) to find optimal settings
- Review [performance metrics](file:///c:/dev/composition-engine/docs/METRICS.md) for your use case
- Check [BACKLOG.md](file:///c:/dev/composition-engine/BACKLOG.md) for future optimizations
