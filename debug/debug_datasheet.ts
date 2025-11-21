
import { parseXml, findRecords } from "../src/utils/xml.ts";

const xmlText = await Deno.readTextFile("inp/datasheet.xml");
const root = parseXml(xmlText);
console.log("Root keys:", Object.keys(root));
console.log("Root structure:", JSON.stringify(root, null, 2));

const records = findRecords(root, ".");
console.log("Record 0 keys:", Object.keys(records[0]));
console.log("Record 0 structure:", JSON.stringify(records[0], null, 2));
