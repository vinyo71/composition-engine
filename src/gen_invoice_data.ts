import { ensureDir } from "jsr:@std/fs/ensure-dir";
import { join } from "jsr:@std/path";

const CLIENT_NAMES = [
    "Acme Corp", "Globex Corporation", "Soylent Corp", "Initech", "Umbrella Corp",
    "Stark Industries", "Wayne Enterprises", "Cyberdyne Systems", "Massive Dynamic", "Hooli"
];

const PRODUCT_NAMES = [
    "Web Development", "Consulting Services", "Server Maintenance", "API Integration", "UI/UX Design",
    "Cloud Hosting (Yearly)", "Security Audit", "Database Optimization", "Mobile App Dev", "SEO Optimization"
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

function generateInvoice(index: number) {
    const clientName = randomChoice(CLIENT_NAMES);
    const invoiceDate = new Date(2025, 0, 1);
    invoiceDate.setDate(invoiceDate.getDate() + randomInt(0, 300));
    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + 30);

    const items = [];
    const itemCount = randomInt(3, 10);
    let subtotal = 0;
    let taxTotal = 0;

    for (let i = 0; i < itemCount; i++) {
        const qty = randomInt(1, 50);
        const price = parseFloat(randomFloat(50, 2000).toFixed(2));
        const total = qty * price;
        const taxRate = 0.27; // 27% VAT
        const tax = total * taxRate;

        subtotal += total;
        taxTotal += tax;

        items.push({
            description: randomChoice(PRODUCT_NAMES),
            qty,
            unitPrice: price,
            taxRate: "27%",
            total: total.toFixed(2)
        });
    }

    const grandTotal = subtotal + taxTotal;

    return {
        id: `INV-2025-${String(index).padStart(5, '0')}`,
        date: invoiceDate.toISOString().split('T')[0],
        dueDate: dueDate.toISOString().split('T')[0],
        status: randomChoice(["PAID", "PENDING", "OVERDUE"]),
        client: {
            name: clientName,
            address: "123 Business Rd, Tech City, 1001",
            vatId: `HU${randomInt(10000000, 99999999)}`
        },
        sender: {
            name: "Composition Engine Ltd.",
            address: "42 Code Ave, Developer City, 9000",
            vatId: "HU12345678",
            iban: "HU42 1177 3333 5555 7777 8888 9999",
            swift: "CIBHHUHB"
        },
        items,
        totals: {
            subtotal: subtotal.toFixed(2),
            tax: taxTotal.toFixed(2),
            grandTotal: grandTotal.toFixed(2),
            currency: "EUR"
        }
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

async function generateInvoiceDataset(numDocuments: number) {
    await ensureDir("inp");
    const fileName = join("inp", `monthly_data.xml`);

    const file = await Deno.open(fileName, { write: true, create: true, truncate: true });
    const encoder = new TextEncoder();

    await file.write(encoder.encode('<?xml version="1.0" encoding="utf-8"?>\n'));
    await file.write(encoder.encode('<Invoices>\n'));

    for (let i = 1; i <= numDocuments; i++) {
        const inv = generateInvoice(i);
        let xml = '  <InvoiceRecord>\n';
        xml += `    <Id>${escapeXml(inv.id)}</Id>\n`;
        xml += `    <Date>${escapeXml(inv.date)}</Date>\n`;
        xml += `    <DueDate>${escapeXml(inv.dueDate)}</DueDate>\n`;
        xml += `    <Status>${escapeXml(inv.status)}</Status>\n`;

        xml += `    <Client>\n`;
        xml += `      <Name>${escapeXml(inv.client.name)}</Name>\n`;
        xml += `      <Address>${escapeXml(inv.client.address)}</Address>\n`;
        xml += `      <VatId>${escapeXml(inv.client.vatId)}</VatId>\n`;
        xml += `    </Client>\n`;

        xml += `    <Sender>\n`;
        xml += `      <Name>${escapeXml(inv.sender.name)}</Name>\n`;
        xml += `      <Address>${escapeXml(inv.sender.address)}</Address>\n`;
        xml += `      <VatId>${escapeXml(inv.sender.vatId)}</VatId>\n`;
        xml += `      <IBAN>${escapeXml(inv.sender.iban)}</IBAN>\n`;
        xml += `      <SWIFT>${escapeXml(inv.sender.swift)}</SWIFT>\n`;
        xml += `    </Sender>\n`;

        xml += `    <Items>\n`;
        for (const item of inv.items) {
            xml += `      <Item>\n`;
            xml += `        <Description>${escapeXml(item.description)}</Description>\n`;
            xml += `        <Qty>${escapeXml(item.qty)}</Qty>\n`;
            xml += `        <UnitPrice>${escapeXml(item.unitPrice)}</UnitPrice>\n`;
            xml += `        <TaxRate>${escapeXml(item.taxRate)}</TaxRate>\n`;
            xml += `        <Total>${escapeXml(item.total)}</Total>\n`;
            xml += `      </Item>\n`;
        }
        xml += `    </Items>\n`;

        xml += `    <Totals>\n`;
        xml += `      <Subtotal>${escapeXml(inv.totals.subtotal)}</Subtotal>\n`;
        xml += `      <Tax>${escapeXml(inv.totals.tax)}</Tax>\n`;
        xml += `      <GrandTotal>${escapeXml(inv.totals.grandTotal)}</GrandTotal>\n`;
        xml += `      <Currency>${escapeXml(inv.totals.currency)}</Currency>\n`;
        xml += `    </Totals>\n`;

        xml += '  </InvoiceRecord>\n';
        await file.write(encoder.encode(xml));
    }

    await file.write(encoder.encode('</Invoices>\n'));
    file.close();

    return fileName;
}

if (import.meta.main) {
    const args = Deno.args;
    let size = 50; // Default for "monthly" batch
    if (args.length > 0) {
        const parsed = parseInt(args[0]);
        if (!isNaN(parsed)) size = parsed;
    }

    console.log(`Generating ${size} invoices...`);
    const out = await generateInvoiceDataset(size);
    console.log(`Invoice dataset '${out}' has been generated.`);
}
