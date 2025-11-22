import { ensureDir } from "jsr:@std/fs/ensure-dir";

const OUT_DIR = "./inp";
const OUT_FILE = "chart_data.xml";

async function main() {
    await ensureDir(OUT_DIR);

    const records = [];
    const categories = ["Food", "Rent", "Utilities", "Entertainment", "Transport"];

    for (let i = 1; i <= 5; i++) {
        const data = categories.map(() => Math.floor(Math.random() * 1000) + 100);

        records.push(`
  <Record>
    <id>${i}</id>
    <name>User ${i}</name>
    <labels>
      ${categories.map(c => `<item>${c}</item>`).join("\n      ")}
    </labels>
    <data>
      ${data.map(d => `<item>${d}</item>`).join("\n      ")}
    </data>
  </Record>`);
    }

    const xml = `<Root>\n${records.join("\n")}\n</Root>`;

    await Deno.writeTextFile(`${OUT_DIR}/${OUT_FILE}`, xml);
    console.log(`Generated ${records.length} records to ${OUT_DIR}/${OUT_FILE}`);
}

main();
