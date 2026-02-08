# Performance Tuning Guide

**Version:** 0.6.1 | **Last Updated:** 2026-02-08

This guide helps you optimize the Composition Engine for maximum throughput and
efficiency.

## Table of Contents

- [Hardware Requirements](#hardware-requirements)
- [Concurrency Tuning](#concurrency-tuning)
- [Memory Management](#memory-management)
- [Template Optimization](#template-optimization)
- [Browser Configuration](#browser-configuration)
- [Quick Optimizations](#quick-optimizations)
- [Troubleshooting](#troubleshooting)

## Hardware Requirements

### Minimum

| Component | Requirement              |
| --------- | ------------------------ |
| CPU       | 2 cores                  |
| RAM       | 4GB                      |
| Storage   | SSD recommended          |
| Chrome    | Installed and accessible |

### Recommended (Production)

| Component | Requirement              |
| --------- | ------------------------ |
| CPU       | 4-8 cores                |
| RAM       | 8-16GB                   |
| Storage   | SSD                      |
| Chrome    | Headless Shell installed |

### Scaling Guidelines

| Target           | CPU  | RAM     | Concurrency |
| ---------------- | ---- | ------- | ----------- |
| 10-15 pages/sec  | 2-4  | 4-8GB   | 2-4         |
| 20-30 pages/sec  | 4-8  | 8-16GB  | 4-8         |
| 30-50+ pages/sec | 8-16 | 16-32GB | 8-16        |

## Concurrency Tuning

### Default Behavior

```typescript
// Auto-detected based on CPU cores
concurrency = Math.max(1, navigator.hardwareConcurrency ?? 4);
```

### Manual Override

```bash
# Conservative (memory-constrained)
--concurrency 2

# Balanced (recommended)
--concurrency 4

# Aggressive (high-memory systems)
--concurrency 8
```

### Finding Optimal Value

Run tests with different values:

```bash
for c in 2 4 8; do
  echo "Testing concurrency=$c"
  deno task compose --input test.xml --template tpl.html \
    --outDir ./out/test_$c --concurrency $c --limit 100
done
```

**Optimal:** Highest value where throughput increases and memory stays stable.

## Memory Management

### Streaming Mode

For files >100MB, always use streaming:

```bash
deno task compose --input large.xml --streamTag Record --mode multi
```

### Backpressure Control

The engine limits in-flight tasks automatically:

```typescript
// Permits = concurrency * 2
const semaphore = new Semaphore(opts.concurrency * 2);
```

### Memory Tips

| Tip                    | Impact           |
| ---------------------- | ---------------- |
| Use `--streamTag`      | Constant memory  |
| Use `--skipPageCount`  | -20% memory      |
| Reduce `--concurrency` | -50MB per worker |

## Template Optimization

### Complexity Impact

| Template Type               | Throughput      |
| --------------------------- | --------------- |
| Simple text (1 page)        | 30-35 pages/sec |
| Styled document (2-3 pages) | 20-25 pages/sec |
| Charts + images (5+ pages)  | 10-15 pages/sec |

### Best Practices

1. **Minimize DOM nesting** — flatten structure where possible
2. **Use class selectors** — avoid deep CSS selectors
3. **Optimize images** — use WebP, compress assets
4. **Limit chart data points** — sample if >100 points
5. **Use `page-break-inside: avoid`** — prevent awkward breaks

## Browser Configuration

### Chrome Headless Shell (Recommended)

50% faster startup, 60% less memory:

```bash
# Check if available
which chrome-headless-shell

# Or specify path
--chrome "C:\path\to\chrome-headless-shell.exe"
```

### GPU Acceleration

Enabled by default in v0.6.0+:

- `--enable-gpu-rasterization`
- `--enable-accelerated-2d-canvas`
- `--ignore-gpu-blocklist`

### Browser Pool Pre-warming

Enabled by default in v0.6.0+. Pages pre-created on startup:

```
Pre-warmed 8 browser pages in 193ms
```

## Quick Optimizations

### Tier 1: Immediate Gains

| Optimization       | Command                     | Gain            |
| ------------------ | --------------------------- | --------------- |
| Skip page counting | `--skipPageCount`           | +30-40%         |
| Match concurrency  | `--concurrency <CPU cores>` | +50-100%        |
| Use streaming      | `--streamTag Record`        | Constant memory |

### Tier 2: Template Changes

| Optimization            | Gain    |
| ----------------------- | ------- |
| Simplify DOM            | +10-20% |
| Optimize images         | +5-15%  |
| Reduce chart complexity | +10-30% |

### Optimal Command

```bash
deno task compose \
  --input data.xml \
  --template template.html \
  --outDir ./out \
  --concurrency 4 \
  --skipPageCount \
  --streamTag Record \
  --verbose
```

## Troubleshooting

### Low Throughput

| Symptom                 | Solution                 |
| ----------------------- | ------------------------ |
| CPU <80%                | Increase `--concurrency` |
| CPU 100%, low pages/sec | Simplify template        |
| High disk I/O           | Use SSD                  |

### High Memory

| Symptom                | Solution                  |
| ---------------------- | ------------------------- |
| Memory grows unbounded | Use `--streamTag`         |
| Crashes mid-batch      | Reduce `--concurrency`    |
| Swap usage             | Add RAM or reduce workers |

### Browser Crashes

| Symptom               | Solution                  |
| --------------------- | ------------------------- |
| ConnectionClosedError | Reduce `--concurrency`    |
| Timeouts              | Check template for loops  |
| Missing assets        | Verify paths, check cache |

### Debug Mode

```bash
deno task compose --input data.xml --template tpl.html --outDir ./out \
  --logLevel debug --verbose
```

## Benchmarks (v0.6.1)

**Hardware:** 4-core CPU, 16GB RAM, SSD

| Template            | Records | Concurrency | Pages/sec |
| ------------------- | ------- | ----------- | --------- |
| Simple (1 page)     | 1000    | 4           | 28-35     |
| Styled (2-3 pages)  | 1000    | 4           | 18-25     |
| Heavy (5+ pages)    | 1000    | 4           | 10-15     |
| Insurance (2 pages) | 200     | 8           | 23.3      |

### Optimization Impact

| Optimization          | Throughput | Memory |
| --------------------- | ---------- | ------ |
| `--skipPageCount`     | +30-40%    | -20%   |
| Chrome Headless Shell | +10-20%    | -60%   |
| GPU Acceleration      | +10-20%    | —      |
| Streaming Mode        | —          | -70%   |

## Related Documentation

- [Performance Metrics](METRICS.md) — Baseline measurements
- [Pipeline Optimization](PIPELINE_OPTIMIZATION.md) — Architecture deep-dive
- [Cluster Evaluation](CLUSTER_EVALUATION.md) — Browser pool comparison

---

**Next:** Run [benchmark suite](../benchmark/) to find your optimal settings.
