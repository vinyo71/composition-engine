import puppeteer from "puppeteer";
import { AssetCache } from "./asset_cache.ts";

// Chromium (Puppeteer) HTML+CSS rendering helpers
export type PuppeteerBrowser = any;

async function exists(p: string): Promise<boolean> {
  try { await Deno.stat(p); return true; } catch { return false; }
}

/**
 * Finds chrome-headless-shell executable (lightweight headless Chrome).
 * Headless shell is faster to start and uses less memory than full Chrome.
 */
export async function findHeadlessShell(): Promise<string | undefined> {
  if (Deno.build.os === "windows") {
    const candidates = [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome-headless-shell.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome-headless-shell.exe",
      `${Deno.env.get("LOCALAPPDATA") ?? "C:\\Users\\%USERNAME%\\AppData\\Local"}\\Google\\Chrome\\Application\\chrome-headless-shell.exe`,
    ];
    for (const p of candidates) if (await exists(p)) return p;
  } else if (Deno.build.os === "darwin") {
    const candidates = [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome for Testing",
      `${Deno.env.get("HOME") ?? ""}/Applications/Google Chrome.app/Contents/MacOS/Google Chrome for Testing`,
      "/usr/local/bin/chrome-headless-shell",
    ];
    for (const p of candidates) if (await exists(p)) return p;
  } else {
    const candidates = [
      "/usr/bin/chrome-headless-shell",
      "/usr/bin/google-chrome-headless-shell",
      "/usr/local/bin/chrome-headless-shell",
      "/snap/bin/chrome-headless-shell",
    ];
    for (const p of candidates) if (await exists(p)) return p;
  }
  return undefined;
}

export async function findChromeExecutable(): Promise<string | undefined> {
  const envPath = Deno.env.get("PUPPETEER_EXECUTABLE_PATH");
  if (envPath && await exists(envPath)) return envPath;

  if (Deno.build.os === "windows") {
    const candidates = [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      `${Deno.env.get("LOCALAPPDATA") ?? "C:\\Users\\%USERNAME%\\AppData\\Local"}\\Google\\Chrome\\Application\\chrome.exe`,
      "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
      "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    ];
    for (const p of candidates) if (await exists(p)) return p;
  } else if (Deno.build.os === "darwin") {
    const candidates = [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      `${Deno.env.get("HOME") ?? ""}/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`,
    ];
    for (const p of candidates) if (await exists(p)) return p;
  }
  else {
    const candidates = [
      "/usr/bin/google-chrome",
      "/usr/bin/google-chrome-stable",
      "/usr/bin/chromium",
      "/usr/bin/chromium-browser",
      "/snap/bin/chromium",
    ];
    for (const p of candidates) if (await exists(p)) return p;
  }
  return undefined;
}

export async function createBrowser(executablePath?: string): Promise<PuppeteerBrowser> {
  // Try headless shell first (faster, lighter), then fall back to regular Chrome
  const exe = executablePath || await findHeadlessShell() || await findChromeExecutable();
  const browser = await puppeteer.launch(
    exe ? { headless: "new" as any, executablePath: exe } : { headless: "new" as any },
  );
  return browser;
}

export async function closeBrowser(browser: PuppeteerBrowser) {
  try {
    await browser?.close();
  } catch {
    // ignore
  }
}

// Global asset cache instance (shared across all PDF generations)
const globalAssetCache = new AssetCache(50); // 50MB cache

export async function htmlToPdfBytes(
  browserOrPage: PuppeteerBrowser | any,
  fullHtml: string,
  cssContent = "",
  headerTemplate?: string,
  footerTemplate?: string
): Promise<Uint8Array> {
  let page: any;
  let shouldClose = false;

  // Check if it's a Browser (has newPage) or a Page (has setContent)
  if (typeof browserOrPage.newPage === "function") {
    page = await browserOrPage.newPage();
    shouldClose = true;
  } else {
    page = browserOrPage;
  }

  try {
    // Enable request interception for asset caching
    await page.setRequestInterception(true);

    // Handle requests with cache
    page.on('request', (req: any) => globalAssetCache.intercept(req));

    // Cache responses
    page.on('response', (res: any) => globalAssetCache.handleResponse(res));

    await page.setContent(fullHtml, { waitUntil: "load", timeout: 30000 });
    if (cssContent) {
      await page.addStyleTag({ content: cssContent });
    }
    const buf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", right: "15mm", bottom: "20mm", left: "15mm" },
      displayHeaderFooter: !!(headerTemplate || footerTemplate),
      headerTemplate: headerTemplate || "<div></div>",
      footerTemplate: footerTemplate || "<div></div>",
      timeout: 30000,
    });
    return buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  } finally {
    if (shouldClose) {
      await page.close();
    }
  }
}

/**
 * Gets the current asset cache statistics.
 */
export function getAssetCacheStats() {
  return globalAssetCache.getStats();
}

/**
 * Clears the asset cache.
 */
export function clearAssetCache() {
  globalAssetCache.clear();
}