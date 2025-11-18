import { XMLParser } from "fast-xml-parser";

export function parseXml(xmlText: string): any {
  const parser = new XMLParser({
    ignoreAttributes: false,
    allowBooleanAttributes: true,
    attributeNamePrefix: "",
    parseTagValue: true,
    parseAttributeValue: true,
    trimValues: true,
  });
  const root = parser.parse(xmlText);
  if (!root || typeof root !== "object") {
    throw new Error("Failed to parse XML root.");
  }
  return root;
}

function deepGet(obj: any, path: string): any {
  const tokens = path
    .replaceAll("[", ".")
    .replaceAll("]", "")
    .split(".")
    .filter(Boolean);
  let cur = obj;
  for (const t of tokens) {
    if (cur == null) return undefined;
    cur = cur[t];
  }
  return cur;
}

function findFirstArrayNode(obj: any, path: string[] = []): { path: string; array: any[] } | null {
  if (Array.isArray(obj)) {
    return { path: path.join("."), array: obj };
  }
  if (obj && typeof obj === "object") {
    for (const key of Object.keys(obj)) {
      const res = findFirstArrayNode(obj[key], [...path, key]);
      if (res) return res;
    }
  }
  return null;
}

export function findRecords(root: any, recordPath?: string): any[] {
  if (recordPath) {
    const node = deepGet(root, recordPath);
    if (Array.isArray(node)) return node;
    if (node && typeof node === "object") return [node];
    throw new Error(`--recordPath='${recordPath}' did not resolve to an array or object.`);
  }
  const found = findFirstArrayNode(root);
  if (found) return found.array;
  // Fallback: single record as whole document
  return [root];
}

// Stream <tagName>...</tagName> blocks from a large XML file without loading it fully
export async function* streamXmlElements(filePath: string, tagName: string): AsyncGenerator<string> {
  const file = await Deno.open(filePath, { read: true });
  try {
    const reader = file.readable.pipeThrough(new TextDecoderStream()).getReader();
    let buf = "";
    const startNeedle = `<${tagName}`;
    const endNeedle = `</${tagName}>`;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += value ?? "";

      while (true) {
        const start = buf.indexOf(startNeedle);
        if (start === -1) {
          // Keep a small tail in case a start tag spans chunks
          buf = buf.slice(-Math.max(startNeedle.length, 64));
          break;
        }
        const startTagEnd = buf.indexOf(">", start);
        if (startTagEnd === -1) {
          // Need more data to finish start tag
          break;
        }
        const end = buf.indexOf(endNeedle, startTagEnd + 1);
        if (end === -1) {
          // Need more data for end tag
          // Keep from start to end to avoid losing partial element
          buf = buf.slice(start);
          break;
        }
        const endClose = end + endNeedle.length;
        const elementXml = buf.slice(start, endClose);
        yield elementXml;
        buf = buf.slice(endClose);
      }
    }
  } finally {
    try {
      file.close();
    } catch {
      // Ignore if already closed
    }
  }
}