import { assertEquals } from "jsr:@std/assert";
import { parseXml, findRecords } from "../src/utils/xml.ts";
import { compileTemplate } from "../src/services/template.ts";

Deno.test("XML Parser - Basic Parsing", () => {
  const xml = "<Root><Item>Value</Item></Root>";
  const obj = parseXml(xml);
  assertEquals(obj.Root.Item, "Value");
});

Deno.test("XML Parser - Find Records", () => {
  const xml = `
    <Root>
      <Items>
        <Item id="1">A</Item>
        <Item id="2">B</Item>
      </Items>
    </Root>
  `;
  const obj = parseXml(xml);
  const records = findRecords(obj, "Root.Items.Item");
  assertEquals(records.length, 2);
  assertEquals(records[0]["#text"], "A");
  assertEquals(records[1]["#text"], "B");
});

Deno.test("Template Engine - Compilation and Rendering", () => {
  const tpl = "Hello {{Name}}!";
  const render = compileTemplate(tpl);
  const result = render({ Name: "World" });
  assertEquals(result.trim(), "Hello World!");
});

Deno.test("Template Engine - Helpers", () => {
  const tpl = "Price: {{formatNumber Price 2 'en-US'}}";
  const render = compileTemplate(tpl);
  const result = render({ Price: 123.456 });
  assertEquals(result.trim(), "Price: 123.46");
});
