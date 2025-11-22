#!/usr/bin/env -S deno run -A

/**
 * Generate test data for benchmarking
 * Creates XML files with varying sizes for performance testing
 */

import { join } from "jsr:@std/path";

async function generateBankStatements(count: number, outputFile: string) {
    console.log(`Generating ${count} bank statements...`);

    const statements: string[] = [];

    for (let i = 0; i < count; i++) {
        const accountNumber = `HU${String(Math.floor(Math.random() * 1e26)).padStart(26, "0")}`;
        const balance = (Math.random() * 100000).toFixed(2);

        statements.push(`
    <BankStatement>
        <AccountHolder>
            <Name>Test User ${i + 1}</Name>
            <Address>Test Street ${i + 1}, Budapest, 1234</Address>
        </AccountHolder>
        <Account>
            <AccountNumber>${accountNumber}</AccountNumber>
            <Currency>HUF</Currency>
        </Account>
        <Period>
            <From>2025-11-01</From>
            <To>2025-11-30</To>
        </Period>
        <Summary>
            <OpeningBalance>${balance}</OpeningBalance>
            <TotalCredits>${(Math.random() * 50000).toFixed(2)}</TotalCredits>
            <TotalDebits>${(Math.random() * 40000).toFixed(2)}</TotalDebits>
            <ClosingBalance>${(parseFloat(balance) + Math.random() * 10000).toFixed(2)}</ClosingBalance>
        </Summary>
        <Transactions>
            ${generateTransactions(10 + Math.floor(Math.random() * 20))}
        </Transactions>
    </BankStatement>`);
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<BankStatements>
${statements.join("\n")}
</BankStatements>`;

    await Deno.writeTextFile(outputFile, xml);
    console.log(`✅ Created: ${outputFile}`);
}

function generateTransactions(count: number): string {
    const transactions: string[] = [];
    const types = [
        { type: "Bérutalás", minAmount: 200000, maxAmount: 500000 },
        { type: "Készpénzfelvétel", minAmount: 10000, maxAmount: 50000 },
        { type: "Bankkártyás fizetés", minAmount: 500, maxAmount: 20000 },
        { type: "Átutalás", minAmount: 5000, maxAmount: 100000 },
    ];

    for (let i = 0; i < count; i++) {
        const txType = types[Math.floor(Math.random() * types.length)];
        const amount = (Math.random() * (txType.maxAmount - txType.minAmount) + txType.minAmount).toFixed(2);
        const day = 1 + Math.floor(Math.random() * 28);

        transactions.push(`
            <Transaction>
                <Date>2025-11-${String(day).padStart(2, "0")}</Date>
                <Type>${txType.type}</Type>
                <Description>Test Transaction ${i + 1}</Description>
                <Amount>${amount}</Amount>
                <Balance>${(Math.random() * 500000).toFixed(2)}</Balance>
            </Transaction>`);
    }

    return transactions.join("\n");
}

async function main() {
    console.log("═══════════════════════════════════════════════════════");
    console.log("   Generating Benchmark Test Data");
    console.log("═══════════════════════════════════════════════════════\n");

    await Deno.mkdir("./inp", { recursive: true });

    // Generate different dataset sizes
    const datasets = [
        { count: 10, file: "./inp/bank_statements_10.xml" },
        { count: 50, file: "./inp/bank_statements_50.xml" },
        { count: 100, file: "./inp/bank_statements_100.xml" },
        { count: 500, file: "./inp/bank_statements_500.xml" },
        { count: 1000, file: "./inp/bank_statements_1000.xml" },
    ];

    for (const dataset of datasets) {
        await generateBankStatements(dataset.count, dataset.file);
    }

    console.log("\n✅ All test datasets generated!");
}

if (import.meta.main) {
    await main();
}
