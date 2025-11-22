import { ensureDir } from "jsr:@std/fs/ensure-dir";
import { join } from "jsr:@std/path";

const HUNGARIAN_NAMES = [
    "Nagy János", "Kovács Éva", "Tóth István", "Szabó Katalin", "Horváth Péter",
    "Kiss Mária", "Varga Ferenc", "Molnár Anna", "Németh László", "Balogh Erzsébet",
    "Farkas Katalin", "Papp Zoltán", "Takács Zsuzsa", "Juhász Gábor", "Lakatos Eszter",
    "Mészáros Attila", "Oláh Viktória", "Simon Balázs", "Rácz Judit", "Fekete Tamás"
];

const HUNGARIAN_CITIES = [
    "Budapest", "Debrecen", "Szeged", "Miskolc", "Pécs", "Győr", "Nyíregyháza",
    "Kecskemét", "Székesfehérvár", "Szombathely", "Eger", "Veszprém", "Zalaegerszeg",
    "Sopron", "Kaposvár", "Békéscsaba", "Tatabánya", "Szolnok", "Hódmezővásárhely", "Dunaújváros"
];

const STREET_NAMES = [
    "Kossuth utca", "Petőfi utca", "Rákóczi út", "Ady Endre utca", "Dózsa György út",
    "Árpád út", "Béke tér", "Széchenyi utca", "Deák Ferenc utca", "Bajcsy-Zsilinszky út",
    "Bartók Béla út", "József Attila utca", "Hunyadi János utca", "Jókai utca", "Arany János utca",
    "Szent István körút", "Váci utca", "Alkotmány utca", "Baross utca", "Damjanich utca"
];

// Hungarian Transaction Types
const MERCHANTS = [
    "Tesco Budapest", "SPAR Szeged", "Auchan Debrecen", "LIDL Pécs", "CBA Győr",
    "MOL Benzinkút", "Shell Budapest", "OMV Miskolc",
    "MÁV Jegypénztár", "BKK Budapesti Közlekedési Központ",
    "Vodafone", "Telekom", "Telenor", "Yettel",
    "ELMŰ Áramszolgáltató", "FŐGÁZ", "Budapest Vízmű", "DÉMÁSZ",
    "Allee Bevásárlóközpont", "WestEnd City Center", "Árkád Budapest",
    "Burger King", "McDonald's", "KFC", "Pizza Hut",
    "Cinema City", "IMAX", "Művész Mozi",
    "Decathlon", "IKEA", "MediaMarkt", "Rossmann"
];

const TRANSACTION_TYPES = {
    // Credits
    salary: { hu: "Bérutalás", companies: ["ACME Kft.", "TechHub Zrt.", "SoftDev Zrt.", "DataCorp Nyrt.", "InfoSys Hungary", "CloudTech Kft."] },
    incomingTransfer: { hu: "Átutalás bejövő" },
    cashDeposit: { hu: "Készpénzbefizetés" },
    interest: { hu: "Kamatjóváírás" },

    // Debits
    atmWithdrawal: { hu: "Készpénzfelvétel - ATM" },
    cardPayment: { hu: "Bankkártyás fizetés" },
    outgoingTransfer: { hu: "Átutalás kimenő" },
    directDebit: { hu: "Csoportos beszedés" },
    accountFee: { hu: "Számlavezetési díj" },
    transactionTax: { hu: "Tranzakciós illeték" },
    smsFee: { hu: "SMS értesítési díj" }
};

const UTILITIES = [
    "ELMŰ villanyáram", "FŐGÁZ földgáz", "Fővárosi Vízművek",
    "Vodafone előfizetés", "Telekom internet", "Netflix előfizetés",
    "Spotify Premium", "HBO Max", "YouTube Premium"
];

function randomChoice<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number): number {
    return Math.random() * (max - min) + min;
}

function generateIban(): string {
    const bankCode = randomChoice(["1177", "1070", "1040", "1030"]);
    let accountNumber = "";
    for (let i = 0; i < 20; i++) {
        accountNumber += randomInt(0, 9);
    }
    return `HU42 ${bankCode} ${accountNumber.slice(0, 4)} ${accountNumber.slice(4, 8)} ${accountNumber.slice(8, 12)} ${accountNumber.slice(12, 16)} ${accountNumber.slice(16, 20)}`;
}

function generateTransactions(startDate: Date, endDate: Date, openingBalance: number) {
    const transactions = [];
    const currentDate = new Date(startDate);
    let balance = openingBalance;
    let totalCredits = 0;
    let totalDebits = 0;

    // Add salary at the beginning of the month
    const salaryAmount = parseFloat(randomFloat(250000, 650000).toFixed(2));
    const salaryDate = new Date(startDate);
    salaryDate.setDate(randomInt(1, 5)); // Salary typically comes in first few days

    transactions.push({
        date: salaryDate.toISOString(),
        valueDate: salaryDate.toISOString(),
        description: `${TRANSACTION_TYPES.salary.hu} - ${randomChoice(TRANSACTION_TYPES.salary.companies)}`,
        debit: null,
        credit: salaryAmount,
        balance: balance + salaryAmount
    });
    balance += salaryAmount;
    totalCredits += salaryAmount;

    // Generate random transactions throughout the month
    const numTransactions = randomInt(15, 35);

    for (let i = 0; i < numTransactions; i++) {
        const transDate = new Date(startDate);
        transDate.setDate(randomInt(1, 28));

        const valueDate = new Date(transDate);
        if (Math.random() > 0.7) {
            valueDate.setDate(valueDate.getDate() + randomInt(1, 2));
        }

        const txType = randomChoice([
            'atmWithdrawal', 'cardPayment', 'directDebit', 'outgoingTransfer',
            'incomingTransfer', 'cashDeposit'
        ]);

        let description = "";
        let debit = null;
        let credit = null;

        switch (txType) {
            case 'atmWithdrawal':
                debit = parseFloat(randomFloat(10000, 50000).toFixed(2));
                description = `${TRANSACTION_TYPES.atmWithdrawal.hu} - ${randomChoice(['Budapest', 'Debrecen', 'Szeged'])}`;
                break;

            case 'cardPayment':
                debit = parseFloat(randomFloat(1500, 35000).toFixed(2));
                description = `${TRANSACTION_TYPES.cardPayment.hu} - ${randomChoice(MERCHANTS)}`;
                break;

            case 'directDebit':
                debit = parseFloat(randomFloat(3000, 25000).toFixed(2));
                description = `${TRANSACTION_TYPES.directDebit.hu} - ${randomChoice(UTILITIES)}`;
                break;

            case 'outgoingTransfer':
                debit = parseFloat(randomFloat(5000, 100000).toFixed(2));
                description = `${TRANSACTION_TYPES.outgoingTransfer.hu} - ${randomChoice(HUNGARIAN_NAMES)}`;
                break;

            case 'incomingTransfer':
                credit = parseFloat(randomFloat(5000, 50000).toFixed(2));
                description = `${TRANSACTION_TYPES.incomingTransfer.hu} - ${randomChoice(HUNGARIAN_NAMES)}`;
                break;

            case 'cashDeposit':
                credit = parseFloat(randomFloat(10000, 100000).toFixed(2));
                description = TRANSACTION_TYPES.cashDeposit.hu;
                break;
        }

        if (debit) {
            balance -= debit;
            totalDebits += debit;
        } else if (credit) {
            balance += credit;
            totalCredits += credit;
        }

        transactions.push({
            date: transDate.toISOString(),
            valueDate: valueDate.toISOString(),
            description,
            debit,
            credit,
            balance: parseFloat(balance.toFixed(2))
        });
    }

    // Add monthly account fee
    const feeDate = new Date(endDate);
    feeDate.setDate(28);
    const accountFee = 990;
    balance -= accountFee;
    totalDebits += accountFee;

    transactions.push({
        date: feeDate.toISOString(),
        valueDate: feeDate.toISOString(),
        description: TRANSACTION_TYPES.accountFee.hu,
        debit: accountFee,
        credit: null,
        balance: parseFloat(balance.toFixed(2))
    });

    // Sort transactions by date
    transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Recalculate running balance in correct order
    let runningBalance = openingBalance;
    transactions.forEach(tx => {
        if (tx.credit) {
            runningBalance += tx.credit;
        } else if (tx.debit) {
            runningBalance -= tx.debit;
        }
        tx.balance = parseFloat(runningBalance.toFixed(2));
    });

    return {
        transactions,
        totalCredits: parseFloat(totalCredits.toFixed(2)),
        totalDebits: parseFloat(totalDebits.toFixed(2)),
        closingBalance: parseFloat(runningBalance.toFixed(2))
    };
}

function generateBankStatement() {
    const name = randomChoice(HUNGARIAN_NAMES);
    const city = randomChoice(HUNGARIAN_CITIES);
    const street = randomChoice(STREET_NAMES);
    const houseNumber = randomInt(1, 100);
    const address = `${city}, ${street} ${houseNumber}.`;

    // Generate for December 2025
    const startDate = new Date(2025, 11, 1); // December 1, 2025
    const endDate = new Date(2025, 11, 31); // December 31, 2025
    const statementDate = new Date(2026, 0, 2); // January 2, 2026

    const openingBalance = parseFloat(randomFloat(50000, 300000).toFixed(2));
    const { transactions, totalCredits, totalDebits, closingBalance } = generateTransactions(startDate, endDate, openingBalance);

    const bankName = randomChoice(["Demo Bank Zrt.", "Példa Bank Nyrt."]);
    const bankAddress = bankName.includes("Demo")
        ? "1051 Budapest, Szabadság tér 5-6."
        : "1054 Budapest, Kálmán Imre utca 1.";

    return {
        bankName,
        bankAddress,
        statementPeriod: {
            from: "2025-12-01",
            to: "2025-12-31"
        },
        statementDate: statementDate.toISOString(),
        accountHolder: {
            name,
            address
        },
        accountNumber: generateIban(),
        openingBalance,
        closingBalance,
        totalCredits,
        totalDebits,
        transactions
    };
}

function escapeXml(unsafe: string | number): string {
    return String(unsafe)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

async function generateXmlDataset(numDocuments: number) {
    await ensureDir("inp");
    const fileName = join("inp", `bank_statements_${numDocuments}.xml`);

    const file = await Deno.open(fileName, { write: true, create: true, truncate: true });
    const encoder = new TextEncoder();

    await file.write(encoder.encode('<?xml version="1.0" encoding="utf-8"?>\n'));
    await file.write(encoder.encode('<BankStatements>\n'));

    for (let i = 0; i < numDocuments; i++) {
        const stmt = generateBankStatement();
        let xml = '  <BankStatement>\n';
        xml += `    <BankName>${escapeXml(stmt.bankName)}</BankName>\n`;
        xml += `    <BankAddress>${escapeXml(stmt.bankAddress)}</BankAddress>\n`;
        xml += `    <StatementPeriod>\n`;
        xml += `      <From>${escapeXml(stmt.statementPeriod.from)}</From>\n`;
        xml += `      <To>${escapeXml(stmt.statementPeriod.to)}</To>\n`;
        xml += `    </StatementPeriod>\n`;
        xml += `    <StatementDate>${escapeXml(stmt.statementDate)}</StatementDate>\n`;
        xml += `    <AccountHolder>\n`;
        xml += `      <Name>${escapeXml(stmt.accountHolder.name)}</Name>\n`;
        xml += `      <Address>${escapeXml(stmt.accountHolder.address)}</Address>\n`;
        xml += `    </AccountHolder>\n`;
        xml += `    <AccountNumber>${escapeXml(stmt.accountNumber)}</AccountNumber>\n`;
        xml += `    <OpeningBalance>${escapeXml(stmt.openingBalance)}</OpeningBalance>\n`;
        xml += `    <ClosingBalance>${escapeXml(stmt.closingBalance)}</ClosingBalance>\n`;
        xml += `    <TotalCredits>${escapeXml(stmt.totalCredits)}</TotalCredits>\n`;
        xml += `    <TotalDebits>${escapeXml(stmt.totalDebits)}</TotalDebits>\n`;
        xml += `    <Transactions>\n`;
        for (const tx of stmt.transactions) {
            xml += `      <Transaction>\n`;
            xml += `        <Date>${escapeXml(tx.date)}</Date>\n`;
            xml += `        <ValueDate>${escapeXml(tx.valueDate)}</ValueDate>\n`;
            xml += `        <Description>${escapeXml(tx.description)}</Description>\n`;
            xml += `        <Debit>${tx.debit !== null ? escapeXml(tx.debit) : ''}</Debit>\n`;
            xml += `        <Credit>${tx.credit !== null ? escapeXml(tx.credit) : ''}</Credit>\n`;
            xml += `        <Balance>${escapeXml(tx.balance)}</Balance>\n`;
            xml += `      </Transaction>\n`;
        }
        xml += `    </Transactions>\n`;
        xml += '  </BankStatement>\n';
        await file.write(encoder.encode(xml));
    }

    await file.write(encoder.encode('</BankStatements>\n'));
    file.close();

    return fileName;
}

if (import.meta.main) {
    const args = Deno.args;
    let size = 1000; // Default
    if (args.length > 0) {
        const parsed = parseInt(args[0]);
        if (!isNaN(parsed)) size = parsed;
    } else {
        console.log("Usage: deno run -A src/generators/gen_data.ts [count]");
        console.log("Defaulting to 1000 records.");
    }

    console.log(`Generating ${size} bank statement records...`);
    const out = await generateXmlDataset(size);
    console.log(`✓ XML dataset '${out}' has been generated.`);
}
