#!/usr/bin/env -S deno run -A

/**
 * Benchmarking Suite for Composition Engine
 * 
 * Systematically tests performance across different configurations:
 * - Variable concurrency levels
 * - Different dataset sizes
 * - With/without optimizations
 * 
 * Usage:
 *   deno run -A benchmark/run_benchmark.ts
 */

import { join } from "jsr:@std/path";

interface BenchmarkConfig {
    name: string;
    inputFile: string;
    template: string;
    recordPath: string;
    concurrency: number;
    skipPageCount?: boolean;
    streamTag?: string;
    limit?: number;
}

interface BenchmarkResult {
    config: BenchmarkConfig;
    setupTime: number;
    processingTime: number;
    totalTime: number;
    totalPages: number;
    throughput: number;
    recordsProcessed: number;
}

async function runBenchmark(config: BenchmarkConfig): Promise<BenchmarkResult> {
    console.log(`\n🔬 Running: ${config.name}`);
    console.log(`   Concurrency: ${config.concurrency}, Skip Page Count: ${config.skipPageCount ?? false}`);

    const args = [
        "task", "compose",
        "--input", config.inputFile,
        "--template", config.template,
        "--outDir", `./out/benchmark/${config.name.replace(/\s/g, "_")}`,
        "--mode", "multi",
        "--concurrency", String(config.concurrency),
        "--recordPath", config.recordPath,
    ];

    if (config.skipPageCount) {
        args.push("--skipPageCount");
    }

    if (config.streamTag) {
        args.push("--streamTag", config.streamTag);
    }

    if (config.limit) {
        args.push("--limit", String(config.limit));
    }

    const cmd = new Deno.Command("deno", { args, stdout: "piped", stderr: "piped" });
    const startTime = performance.now();
    const output = await cmd.output();
    const endTime = performance.now();

    const stdout = new TextDecoder().decode(output.stdout);
    const stderr = new TextDecoder().decode(output.stderr);

    // Parse output
    const setupMatch = stdout.match(/Setup:\s+([\d.]+)\s+ms/);
    const processingMatch = stdout.match(/Processing:\s+([\d.]+)\s+ms/);
    const pagesMatch = stdout.match(/Total Pages:\s+(\d+)/);
    const throughputMatch = stdout.match(/Throughput:\s+([\d.]+)\s+pages\/sec/);
    const recordsMatch = stdout.match(/Records:\s+(\d+)/);

    if (!output.success) {
        console.error(`   ❌ FAILED:`);
        console.error(stderr);
        throw new Error(`Benchmark failed: ${config.name}`);
    }

    const result: BenchmarkResult = {
        config,
        setupTime: setupMatch ? parseFloat(setupMatch[1]) : 0,
        processingTime: processingMatch ? parseFloat(processingMatch[1]) : 0,
        totalTime: endTime - startTime,
        totalPages: pagesMatch ? parseInt(pagesMatch[1]) : 0,
        throughput: throughputMatch ? parseFloat(throughputMatch[1]) : 0,
        recordsProcessed: recordsMatch ? parseInt(recordsMatch[1]) : 0,
    };

    console.log(`   ✅ Complete: ${result.throughput.toFixed(2)} pages/sec, ${result.totalPages} pages`);
    return result;
}

async function main() {
    console.log("═══════════════════════════════════════════════════════");
    console.log("   Composition Engine - Performance Benchmark Suite");
    console.log("═══════════════════════════════════════════════════════\n");

    // Ensure benchmark output directory exists
    await Deno.mkdir("./out/benchmark", { recursive: true });

    const configs: BenchmarkConfig[] = [
        // Baseline: Default settings
        {
            name: "Baseline - Concurrency 4",
            inputFile: "./inp/bank_statements_100.xml",
            template: "./templates/statement.html",
            recordPath: "BankStatements.BankStatement",
            concurrency: 4,
        },

        // Variable Concurrency
        {
            name: "Low Concurrency - 2",
            inputFile: "./inp/bank_statements_100.xml",
            template: "./templates/statement.html",
            recordPath: "BankStatements.BankStatement",
            concurrency: 2,
        },
        {
            name: "High Concurrency - 8",
            inputFile: "./inp/bank_statements_100.xml",
            template: "./templates/statement.html",
            recordPath: "BankStatements.BankStatement",
            concurrency: 8,
        },

        // Skip Page Count Optimization
        {
            name: "Skip Page Count - Concurrency 4",
            inputFile: "./inp/bank_statements_100.xml",
            template: "./templates/statement.html",
            recordPath: "BankStatements.BankStatement",
            concurrency: 4,
            skipPageCount: true,
        },

        // Streaming Mode
        {
            name: "Streaming Mode - Concurrency 4",
            inputFile: "./inp/bank_statements_100.xml",
            template: "./templates/statement.html",
            recordPath: "BankStatements.BankStatement",
            concurrency: 4,
            streamTag: "BankStatement",
        },

        // Different Dataset Sizes
        {
            name: "Small Dataset - 10 records",
            inputFile: "./inp/bank_statements_100.xml",
            template: "./templates/statement.html",
            recordPath: "BankStatements.BankStatement",
            concurrency: 4,
            limit: 10,
        },
        {
            name: "Medium Dataset - 50 records",
            inputFile: "./inp/bank_statements_100.xml",
            template: "./templates/statement.html",
            recordPath: "BankStatements.BankStatement",
            concurrency: 4,
            limit: 50,
        },

        // Combined Optimizations
        {
            name: "Optimized - Streaming + Skip Page Count + Concurrency 8",
            inputFile: "./inp/bank_statements_100.xml",
            template: "./templates/statement.html",
            recordPath: "BankStatements.BankStatement",
            concurrency: 8,
            skipPageCount: true,
            streamTag: "BankStatement",
        },
    ];

    const results: BenchmarkResult[] = [];

    for (const config of configs) {
        try {
            const result = await runBenchmark(config);
            results.push(result);
            // Brief pause between benchmarks
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (err) {
            console.error(`Failed to run benchmark: ${config.name}`, err);
        }
    }

    // Generate summary report
    console.log("\n═══════════════════════════════════════════════════════");
    console.log("                   BENCHMARK RESULTS");
    console.log("═══════════════════════════════════════════════════════\n");

    console.log("| Configuration | Records | Pages | Throughput (pages/sec) | Total Time (ms) |");
    console.log("|--------------|---------|-------|----------------------|-----------------|");

    for (const result of results) {
        console.log(
            `| ${result.config.name.padEnd(28)} | ${String(result.recordsProcessed).padStart(7)} | ${String(result.totalPages).padStart(5)} | ${result.throughput.toFixed(2).padStart(20)} | ${result.processingTime.toFixed(2).padStart(15)} |`
        );
    }

    // Save results to JSON
    const outputFile = "./out/benchmark/results.json";
    await Deno.writeTextFile(
        outputFile,
        JSON.stringify({
            timestamp: new Date().toISOString(),
            systemInfo: {
                os: Deno.build.os,
                arch: Deno.build.arch,
                cpus: (globalThis as any).navigator?.hardwareConcurrency ?? "unknown",
            },
            results,
        }, null, 2)
    );

    console.log(`\n📊 Detailed results saved to: ${outputFile}`);

    // Best performer analysis
    const bestThroughput = results.reduce((best, curr) =>
        curr.throughput > best.throughput ? curr : best
    );

    console.log(`\n🏆 Best Throughput: ${bestThroughput.config.name}`);
    console.log(`   ${bestThroughput.throughput.toFixed(2)} pages/sec`);
    console.log(`   Config: concurrency=${bestThroughput.config.concurrency}, skipPageCount=${bestThroughput.config.skipPageCount ?? false}, streaming=${!!bestThroughput.config.streamTag}`);
}

if (import.meta.main) {
    await main();
}
