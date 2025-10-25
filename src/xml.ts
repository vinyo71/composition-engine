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