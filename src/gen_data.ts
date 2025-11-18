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

const TRANSACTION_TYPES = [
    "ATM készpénzfelvétel", "Fizetés", "Online vásárlás", "Közüzemi számla fizetés",
    "Megtakarítási számlára utalás", "Készpénz befizetés", "Hitel törlesztés",
    "Biztosítási díj fizetés", "Ajándék utalás", "Étkezési költség",
    "Mobiltelefon számla", "Internetszolgáltatás díja", "Parkolási díj", "Üzemanyag vásárlás",
    "Ruházati vásárlás", "Orvosi vizsgálat díja", "Könyv vásárlás", "Mozi jegy", "Utazási költség", "Sportfelszerelés vásárlás"
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
    const countryCode = "HU";
    let accountNumber = "";
    for (let i = 0; i < 24; i++) {
        accountNumber += randomChoice("0123456789".split(""));
    }
    return `${countryCode}${accountNumber}`;
}

function generateTransactions() {
    const transactions = [];
    const count = randomInt(5, 15);
    for (let i = 0; i < count; i++) {
        const currency = randomChoice(["HUF", "EUR"]);
        const amount = currency === "HUF"
            ? parseFloat(randomFloat(-500000, 500000).toFixed(2))
            : parseFloat(randomFloat(-1500, 1500).toFixed(2));

        const date = new Date(2025, 0, 1);
        date.setDate(date.getDate() + randomInt(0, 364));

        transactions.push({
            date: date.toISOString(),
            description: randomChoice(TRANSACTION_TYPES),
            amount,
            currency
        });
    }
    return transactions;
}

function generateBankStatement() {
    const name = randomChoice(HUNGARIAN_NAMES);
    const city = randomChoice(HUNGARIAN_CITIES);
    const street = randomChoice(STREET_NAMES);
    const houseNumber = randomInt(1, 100);
    const address = `${city}, ${street} ${houseNumber}.`;

    return {
        name,
        address,
        accountNumber: generateIban(),
        transactions: generateTransactions()
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
        xml += `    <Name>${escapeXml(stmt.name)}</Name>\n`;
        xml += `    <Address>${escapeXml(stmt.address)}</Address>\n`;
        xml += `    <AccountNumber>${escapeXml(stmt.accountNumber)}</AccountNumber>\n`;
        xml += `    <Transactions>\n`;
        for (const tx of stmt.transactions) {
            xml += `      <Transaction>\n`;
            xml += `        <Date>${escapeXml(tx.date)}</Date>\n`;
            xml += `        <Description>${escapeXml(tx.description)}</Description>\n`;
            xml += `        <Amount>${escapeXml(tx.amount)}</Amount>\n`;
            xml += `        <Currency>${escapeXml(tx.currency)}</Currency>\n`;
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
        // Mimic Python input() if no args, but for automation args are better.
        // We'll default to 1000 if not provided to avoid blocking, or check if we are in a TTY.
        // For this port, let's just use a default or arg.
        console.log("Usage: deno run -A src/gen_data.ts [count]");
        console.log("Defaulting to 1000 records.");
    }

    console.log(`Generating ${size} records...`);
    const out = await generateXmlDataset(size);
    console.log(`XML dataset '${out}' has been generated.`);
}
