import puppeteer, { type Browser } from "puppeteer";
import { readFile } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { wrapSlideHtml, extractFontFamilies, usesItalic } from "./slide-html";
import { getInlinedFontCSS } from "./fonts";
import type { Slide, AspectRatio } from "@/types/carousel";
import { DIMENSIONS } from "@/types/carousel";

// Singleton browser with lifecycle management
let browser: Browser | null = null;
let exportCount = 0;
const MAX_EXPORTS_BEFORE_RESTART = 50;

// Every wait below is bounded. A slide that cannot finish loading still yields
// a PNG rather than hanging the export.
const PAGE_LOAD_TIMEOUT_MS = 20_000;
const FONT_READY_TIMEOUT_MS = 10_000;
const IMAGE_DECODE_TIMEOUT_MS = 10_000;

async function getBrowser(): Promise<Browser> {
  if (browser && exportCount >= MAX_EXPORTS_BEFORE_RESTART) {
    await browser.close().catch(() => {});
    browser = null;
    exportCount = 0;
  }
  if (!browser || !browser.isConnected()) {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
    });
    exportCount = 0;
  }
  return browser;
}

/**
 * Inline all image references in slide HTML.
 * Replaces /uploads/xxx.png paths with data: URIs.
 */
async function inlineImages(html: string): Promise<string> {
  const uploadDir = path.resolve(process.cwd(), "public");
  const imgRegex = /(?:src=["']|url\(["']?)(\/uploads\/[^"'\s)]+)/g;
  const matches = [...html.matchAll(imgRegex)];

  let result = html;
  for (const match of matches) {
    const imgPath = match[1];
    try {
      const fullPath = path.join(uploadDir, imgPath);
      const buffer = await readFile(fullPath);
      const ext = path.extname(imgPath).toLowerCase();
      const mime =
        ext === ".png"
          ? "image/png"
          : ext === ".jpg" || ext === ".jpeg"
            ? "image/jpeg"
            : "image/webp";
      const base64 = buffer.toString("base64");
      result = result.replace(imgPath, `data:${mime};base64,${base64}`);
    } catch {
      // Keep original path — Puppeteer can fetch from localhost
    }
  }

  return result;
}

/**
 * Export a single slide to PNG buffer.
 */
export async function exportSlide(
  slide: Slide,
  aspectRatio: AspectRatio
): Promise<Buffer> {
  const { width, height } = DIMENSIONS[aspectRatio];

  // Get inlined font CSS
  const fontFamilies = extractFontFamilies(slide.html);
  const inlinedFontCss = await getInlinedFontCSS(fontFamilies, {
    italic: usesItalic(slide.html),
  });

  // Inline images
  const inlinedHtml = await inlineImages(slide.html);

  // Build self-contained HTML
  const fullHtml = wrapSlideHtml(inlinedHtml, aspectRatio, {
    inlineFontCss: inlinedFontCss,
  });

  const br = await getBrowser();
  const page = await br.newPage();

  try {
    await page.setViewport({ width, height, deviceScaleFactor: 1 });

    // `load` rather than `domcontentloaded`: it waits for stylesheets and image
    // bytes. Previously the page was screenshotted as soon as the DOM parsed,
    // and images only made it in because the font wait below always stalled for
    // its full timeout. Removing that accidental delay without waiting for
    // images explicitly would have introduced a race.
    await page.setContent(fullHtml, {
      waitUntil: "load",
      timeout: PAGE_LOAD_TIMEOUT_MS,
    });

    // Wait until the font loads the page actually started have settled.
    // The previous check required every *declared* face to reach "loaded",
    // which never happens: Google ships dozens of faces per family across
    // weights and unicode subsets, and the ones this slide does not use stay
    // unloaded forever. That check therefore ran to its full timeout on every
    // slide. `document.fonts.status` reports exactly the pending-loads state.
    await page
      .waitForFunction(() => document.fonts.status === "loaded", {
        timeout: FONT_READY_TIMEOUT_MS,
      })
      .catch(() => {
        console.warn(
          `[export] fonts did not settle within ${FONT_READY_TIMEOUT_MS}ms; capturing anyway`
        );
      });

    // `load` guarantees image bytes arrived, not that they are decoded and
    // paintable. Decoding explicitly makes the capture deterministic.
    await page
      .evaluate(
        (timeoutMs: number) =>
          Promise.race([
            Promise.all(
              Array.from(document.images).map((img) =>
                img.decode().catch(() => undefined)
              )
            ).then(() => undefined),
            new Promise<undefined>((resolve) =>
              setTimeout(() => resolve(undefined), timeoutMs)
            ),
          ]),
        IMAGE_DECODE_TIMEOUT_MS
      )
      .catch(() => {
        console.warn("[export] image decode wait failed; capturing anyway");
      });

    const screenshotBuffer = await page.screenshot({
      type: "png",
      clip: { x: 0, y: 0, width, height },
    });

    exportCount++;

    // Post-process with Sharp: enforce sRGB
    const processed = await sharp(screenshotBuffer)
      .toColorspace("srgb")
      .png()
      .toBuffer();

    return processed;
  } finally {
    await page.close().catch(() => {});
  }
}

/**
 * Export all slides of a carousel to PNG buffers.
 * Processes up to 3 slides concurrently.
 */
export async function exportAllSlides(
  slides: Slide[],
  aspectRatio: AspectRatio,
  onProgress?: (current: number, total: number) => void
): Promise<{ name: string; buffer: Buffer }[]> {
  const results: { name: string; buffer: Buffer }[] = [];
  const CONCURRENCY = 3;

  for (let i = 0; i < slides.length; i += CONCURRENCY) {
    const batch = slides.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map(async (slide, batchIdx) => {
        const idx = i + batchIdx;
        const buffer = await exportSlide(slide, aspectRatio);
        onProgress?.(idx + 1, slides.length);
        return { name: `slide-${idx + 1}.png`, buffer };
      })
    );
    results.push(...batchResults);
  }

  return results;
}
