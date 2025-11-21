import { parseArgs } from "jsr:@std/cli/parse-args";
import { js2xml } from "npm:xml-js";

function randomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(start: Date, end: Date) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function formatDate(date: Date) {
    return date.toISOString().split('T')[0];
}

function generateMVMData(count: number) {
    const bills = [];

    for (let i = 0; i < count; i++) {
        const consumption = randomInt(100, 500); // kWh
        const limit = 210; // Rezsicsökkentett limit (approx)

        const discountedConsumption = Math.min(consumption, limit);
        const marketConsumption = Math.max(0, consumption - limit);

        const priceDiscounted = 36; // Ft/kWh
        const priceMarket = 70; // Ft/kWh
        const priceRealMarket = 250; // Ft/kWh (Savings calculation base)

        const netAmount = (discountedConsumption * priceDiscounted) + (marketConsumption * priceMarket);
        const vat = Math.round(netAmount * 0.27);
        const grossAmount = netAmount + vat;

        // Savings calculation
        const marketValue = consumption * priceRealMarket;
        const billedValue = netAmount; // Net comparison usually
        const savings = marketValue - billedValue;

        const bill = {
            Customer: {
                Name: `Minta ${["János", "Éva", "Péter", "Anna"][randomInt(0, 3)]}`,
                Address: `${randomInt(1000, 9999)} Budapest, Fő utca ${randomInt(1, 100)}.`,
                Id: `100${randomInt(10000, 99999)}`,
                ContractId: `900${randomInt(100000, 999999)}`
            },
            BillDetails: {
                Number: `E-2025-${randomInt(100000, 999999)}`,
                Date: formatDate(new Date()),
                DueDate: formatDate(randomDate(new Date(), new Date(Date.now() + 86400000 * 15))),
                PeriodStart: "2025-10-01",
                PeriodEnd: "2025-10-31",
                PayMethod: "Banki átutalás"
            },
            Meter: {
                POD: `HU000${randomInt(1000000000, 9999999999)}`,
                Id: `M${randomInt(100000, 999999)}`,
                PrevReading: 12000,
                CurrReading: 12000 + consumption,
                Consumption: consumption
            },
            Financials: {
                DiscountedQty: discountedConsumption,
                DiscountedPrice: priceDiscounted,
                MarketQty: marketConsumption,
                MarketPrice: priceMarket,
                NetAmount: netAmount,
                VAT: vat,
                GrossAmount: grossAmount,
                Currency: "Ft"
            },
            Savings: {
                TotalSavings: savings,
                MarketValue: marketValue,
                BilledValue: billedValue
            }
        };
        bills.push(bill);
    }

    return {
        Bills: {
            Bill: bills
        }
    };
}

const args = parseArgs(Deno.args, {
    string: ["out"],
    default: { out: "./inp/mvm_data.xml" },
});

const count = parseInt(args._[0] as string) || 5;
const data = generateMVMData(count);
const xml = js2xml(data, { compact: true, ignoreComment: true, spaces: 2 });

await Deno.writeTextFile(args.out, xml);
console.log(`Generated ${count} MVM bills to ${args.out}`);
