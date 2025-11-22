import Handlebars from "npm:handlebars";
import { parseXml } from "./src/utils/xml.ts";

const xml = `<?xml version="1.0" encoding="utf-8"?>
<Datasheet>
  <Product>
    <Name>Composition Engine</Name>
    <Version>0.3.0</Version>
    <Tagline>Turn Data into Documents.</Tagline>
    <Subtitle>Fast. Scalable. Just HTML & CSS.</Subtitle>
  </Product>
  <Intro>Intro text</Intro>
  <Features>
    <Feature><Title>F1</Title><Description>D1</Description></Feature>
  </Features>
  <Requirements>
    <Requirement>R1</Requirement>
  </Requirements>
  <Pricing>
    <Tier><Name>T1</Name><Price>P1</Price><Description>D1</Description></Tier>
  </Pricing>
  <Contact>
    <Website>web</Website>
    <Email>email</Email>
  </Contact>
  <Performance>
    <Metric><Label>1 Core</Label><Value>450</Value></Metric>
    <Metric><Label>2 Cores</Label><Value>850</Value></Metric>
  </Performance>
</Datasheet>`;

async function main() {
  try {
    const tpl = await Deno.readTextFile("./templates/datasheet.html");
    const data = parseXml(xml);
    const template = Handlebars.compile(tpl);
    const result = template(data);
    console.log("Success!");
  } catch (err) {
    console.error("Error compiling/rendering:", err);
  }
}

main();
