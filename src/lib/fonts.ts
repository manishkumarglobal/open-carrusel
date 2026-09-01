import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import { googleFontsUrl } from "./slide-html";

const FONT_CACHE_DIR = path.resolve(process.cwd(), "data", ".font-cache");

// In-memory cache (survives across requests, lost on restart)
const memoryCache = new Map<string, string>();

// Google serves woff2 only to browsers that advertise support for it.
const WOFF2_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/**
 * Fetch Google Fonts CSS with inlined base64 woff2 data URIs.
 * This creates a fully self-contained CSS string that works without network access.
 *
 * When `italic` is requested the italic cut is fetched as a second, separate
 * request per family. Google rejects the italic axis for families that have no
 * italic design, and that rejection must not cost the family its upright faces.
 */
export async function getInlinedFontCSS(
  families: string[],
  options: { italic?: boolean } = {}
): Promise<string> {
  if (families.length === 0) return "";

  const parts: string[] = [];

  for (const family of families) {
    const roman = await cssForVariant(family, false);
    if (roman) parts.push(roman);

    if (options.italic) {
      const italic = await cssForVariant(family, true);
      // Absent when the family has no italic design. The upright faces above
      // still apply and the browser synthesises a slant, which is the best
      // available result for that family.
      if (italic) parts.push(italic);
    }
  }

  return parts.join("\n");
}

async function cssForVariant(
  family: string,
  italic: boolean
): Promise<string | null> {
  const key = italic ? `${family}::italic` : family;

  const cached = await getCachedFont(key);
  if (cached !== null) return cached;

  try {
    const css = await fetchAndInlineFont(family, italic);
    if (css) {
      await cacheFont(key, css);
      return css;
    }
  } catch {
    // Font not available - skip silently, system font fallback will be used
  }
  return null;
}

/**
 * Cache file name for a variant key.
 *
 * Family names come from AI-authored slide HTML, so they are reduced to safe
 * characters rather than interpolated into a path as-is.
 */
function cacheFileName(key: string): string {
  const safe = key.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `${safe || "font"}.css`;
}

async function getCachedFont(key: string): Promise<string | null> {
  if (memoryCache.has(key)) {
    return memoryCache.get(key)!;
  }

  try {
    const diskPath = path.join(FONT_CACHE_DIR, cacheFileName(key));
    const css = await readFile(diskPath, "utf-8");
    memoryCache.set(key, css);
    return css;
  } catch {
    return null;
  }
}

async function cacheFont(key: string, css: string): Promise<void> {
  memoryCache.set(key, css);
  try {
    await mkdir(FONT_CACHE_DIR, { recursive: true });
    const diskPath = path.join(FONT_CACHE_DIR, cacheFileName(key));
    await writeFile(diskPath, css, "utf-8");
  } catch {
    // Disk cache write failed - not critical
  }
}

async function fetchAndInlineFont(
  family: string,
  italic: boolean
): Promise<string | null> {
  const url = googleFontsUrl(family, { italic, display: "block" });
  const response = await fetch(url, {
    headers: { "User-Agent": WOFF2_USER_AGENT },
  });

  // 400 here means the family has no such cut. That is an expected answer, not
  // an error, and the caller treats a null result as "nothing to add".
  if (!response.ok) return null;
  let css = await response.text();

  // Find all url() references to woff2 files and inline them
  const urlRegex = /url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2)\)/g;
  const matches = [...css.matchAll(urlRegex)];

  for (const match of matches) {
    const fontUrl = match[1];
    try {
      const fontResponse = await fetch(fontUrl);
      if (!fontResponse.ok) continue;
      const buffer = await fontResponse.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      css = css.replace(fontUrl, `data:font/woff2;base64,${base64}`);
    } catch {
      // Keep the original URL - Puppeteer can still fetch it
    }
  }

  // Ensure font-display: block for deterministic rendering
  css = css.replace(/font-display:\s*swap/g, "font-display: block");

  return css;
}
