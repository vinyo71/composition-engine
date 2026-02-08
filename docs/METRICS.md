# Performance Metrics

**Version:** 0.6.1 | **Last Updated:** 2026-02-08

Baseline performance metrics for the Composition Engine.

## Test Environment

| Component | Specification    |
| --------- | ---------------- |
| CPU       | 4-core processor |
| RAM       | 16GB             |
| Storage   | SSD              |
| OS        | Windows 11       |
| Deno      | 2.x (latest)     |
| Chrome    | Headless Shell   |

## Baseline Measurements

### Bank Statement Template (3 pages/record)

| Records | Concurrency | Mode   | Pages | Time | Throughput | Memory |
| ------- | ----------- | ------ | ----- | ---- | ---------- | ------ |
| 10      | 4           | Batch  | 30    | 1.5s | 20 p/s     | 480MB  |
| 50      | 4           | Batch  | 150   | 7.5s | 20 p/s     | 520MB  |
| 100     | 4           | Batch  | 300   | 15s  | 20 p/s     | 580MB  |
| 500     | 8           | Stream | 1500  | 75s  | 20 p/s     | 620MB  |
| 1000    | 8           | Stream | 3000  | 145s | 20.7 p/s   | 650MB  |

### Insurance Template (2 pages/record)

| Records | Concurrency | Mode   | Pages | Time  | Throughput   |
| ------- | ----------- | ------ | ----- | ----- | ------------ |
| 50      | 8           | Stream | 100   | 4.6s  | 21.7 p/s     |
| 100     | 8           | Stream | 200   | 8.9s  | 22.5 p/s     |
| 200     | 8           | Stream | 400   | 17.6s | **23.3 p/s** |

### Template Complexity Impact

| Template                | Pages/Record | Throughput | Relative |
| ----------------------- | ------------ | ---------- | -------- |
| Simple text             | 1            | 30-35 p/s  | 1.0x     |
| Styled document         | 2-3          | 20-25 p/s  | 0.7x     |
| Charts                  | 5            | 12-15 p/s  | 0.4x     |
| Heavy (images + charts) | 10+          | 6-10 p/s   | 0.3x     |

## Optimization Impact

### Skip Page Count (`--skipPageCount`)

| Records | Without  | With     | Improvement |
| ------- | -------- | -------- | ----------- |
| 100     | 10.8 p/s | 14.2 p/s | **+31%**    |
| 500     | 10.3 p/s | 13.7 p/s | **+33%**    |
| 1000    | 10.3 p/s | 13.5 p/s | **+31%**    |

### Headless Shell vs Full Chrome

| Metric        | Full Chrome | Headless Shell | Improvement |
| ------------- | ----------- | -------------- | ----------- |
| Startup       | 1.2-1.5s    | 0.6-0.8s       | **-50%**    |
| Memory (idle) | 180MB       | 75MB           | **-58%**    |
| Throughput    | 10.5 p/s    | 11.2 p/s       | **+7%**     |

### GPU Acceleration (v0.6.0+)

| Metric      | Without GPU | With GPU  | Improvement |
| ----------- | ----------- | --------- | ----------- |
| Render time | 85ms/page   | 72ms/page | **-15%**    |
| Throughput  | 11.0 p/s    | 12.5 p/s  | **+14%**    |

### Asset Caching

| Metric       | Without | With   | Improvement |
| ------------ | ------- | ------ | ----------- |
| First record | 150ms   | 150ms  | —           |
| Subsequent   | 135ms   | 105ms  | **-22%**    |
| Hit rate     | —       | 85-95% | —           |

## Concurrency Scaling

| Concurrency | Throughput | CPU Usage | Memory |
| ----------- | ---------- | --------- | ------ |
| 1           | 3.2 p/s    | 25%       | 420MB  |
| 2           | 6.1 p/s    | 50%       | 480MB  |
| 4           | 10.8 p/s   | 85%       | 580MB  |
| 8           | 14.5 p/s   | 95%       | 780MB  |
| 16          | 15.2 p/s   | 98%       | 1200MB |

**Optimal:** `concurrency = CPU cores` or `2x cores` if memory allows.

## Streaming vs Batch Mode

| Records | Batch Time | Stream Time | Batch Memory | Stream Memory |
| ------- | ---------- | ----------- | ------------ | ------------- |
| 100     | 27.8s      | 28.5s       | 580MB        | 520MB         |
| 500     | 145s       | 148s        | 1850MB       | 620MB         |
| 1000    | 291s       | 296s        | 3420MB       | 650MB         |

**Recommendation:** Use streaming for >100 records or memory-constrained
systems.

## Memory Profiling

### Batch Mode (1000 records)

```
0-10 sec:    450 MB (startup)
10-120 sec:  450-1200 MB (growth)
120-290 sec: 1200-3420 MB (continued)
Peak:        3420 MB
```

### Streaming Mode (1000 records)

```
0-10 sec:    450 MB (startup)
10-290 sec:  520-650 MB (stable)
Peak:        650 MB
```

## Real-World Scenarios

### Scenario 1: Batch Invoices

- **Volume:** 10,000 invoices (1 page each)
- **Concurrency:** 8
- **Flags:** `--skipPageCount --streamTag`
- **Expected:** 16-18 pages/sec = **~9-10 minutes**

### Scenario 2: Bank Statements

- **Volume:** 5,000 statements (3 pages each)
- **Concurrency:** 4
- **Flags:** `--skipPageCount --streamTag`
- **Expected:** 12-14 pages/sec = **~17-20 minutes**

### Scenario 3: Insurance Policies

- **Volume:** 1,000 policies (2 pages each)
- **Concurrency:** 8
- **Flags:** `--streamTag --verbose`
- **Expected:** 11-12 pages/sec = **~3 minutes**

## Version History

### v0.6.1 (Current)

- Extended Handlebars helpers (ifEq, ifGt, json, lowercase)
- XML parser array handling improvements
- Insurance policy template

### v0.6.0

- Browser Pool Pre-warming (-500ms startup)
- GPU Acceleration flags (+10-20%)
- JSON Input Support

### v0.5.1

- JSON Output Mode
- Verbose mode with cache stats
- Job summary improvements

### v0.4.0

- Backpressure control
- Asset caching (LRU eviction)
- Headless shell support

### v0.3.1

- Browser context reuse (2x improvement)

### v0.3.0

- Initial production release (5-6 p/s baseline)

## Quick Reference

### Optimal Configuration (4-core, 16GB)

```bash
deno task compose \
  --input data.xml \
  --template template.html \
  --outDir ./out \
  --concurrency 4 \
  --skipPageCount \
  --streamTag Record
```

### Expected Performance

| Template | Throughput |
| -------- | ---------- |
| Simple   | 14-18 p/s  |
| Medium   | 10-14 p/s  |
| Heavy    | 4-8 p/s    |

### Memory

| Mode          | Memory     |
| ------------- | ---------- |
| Streaming     | 500-700 MB |
| Batch (small) | 400-600 MB |
| Batch (large) | 1-4 GB     |

---

**See also:** [Performance Tuning Guide](PERFORMANCE.md)
