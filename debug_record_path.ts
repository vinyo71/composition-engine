import { parseXml, findRecords } from "./src/xml.ts";

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Datasheet>
  <Product>
    <Name>Composition Engine</Name>
  </Product>
</Datasheet>`;

const root = parseXml(xml);
console.log("Root keys:", Object.keys(root));

try {
    const recordsDot = findRecords(root, ".");
    console.log("Records with '.':", recordsDot.length);
    console.log("Record 0 keys with '.':", Object.keys(recordsDot[0]));
} catch (e) {
    console.log("Error with '.':", e.message);
}

try {
    const recordsDatasheet = findRecords(root, "Datasheet");
    console.log("Records with 'Datasheet':", recordsDatasheet.length);
    console.log("Record 0 keys with 'Datasheet':", Object.keys(recordsDatasheet[0]));
} catch (e) {
    console.log("Error with 'Datasheet':", e.message);
}
