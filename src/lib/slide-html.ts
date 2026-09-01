import type { AspectRatio } from "@/types/carousel";
import { DIMENSIONS } from "@/types/carousel";

/**
 * Keywords that are not downloadable families. `font-family: Inter, sans-serif`
 * declares one web font and one generic fallback; only the former is fetched.
 */
const GENERIC_FAMILIES = new Set([
  "serif",
  "sans-serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "ui-serif",
  "ui-sans-serif",
  "ui-monospace",
  "ui-rounded",
  "math",
  "emoji",
  "fangsong",
  "inherit",
  "initial",
  "unset",
  "revert",
  "revert-layer",
]);

/** Weights requested for every family. Google clamps to what a family has. */
export const FONT_WEIGHTS = [300, 400, 500, 600, 700, 800] as const;

/**
 * Collects family names out of a block of CSS.
 *
 * The declaration value is captured whole and split afterwards. Trying to match
 * the quotes around a family name in the same pass is what broke the previous
 * implementation: it excluded quote characters from the captured value, so
 * `font-family: 'Cormorant Garamond', serif` - the exact form the system prompt
 * teaches the AI to write - never matched at all.
 */
function collectFromCss(css: string, into: Set<string>): void {
  const declaration = /font-family\s*:\s*([^;}]+)/gi;
  let match: RegExpExecArray | null;
  while ((match = declaration.exec(css)) !== null) {
    for (const part of match[1].split(",")) {
      const name = part.trim().replace(/^['"]/, "").replace(/['"]$/, "").trim();
      if (name && !GENERIC_FAMILIES.has(name.toLowerCase())) {
        into.add(name);
      }
    }
  }
}

/**
 * Extract downloadable font family names from slide HTML.
 *
 * Handles quoted and unquoted names, with or without fallbacks, in `<style>`
 * blocks and in inline `style` attributes.
 */
export function extractFontFamilies(html: string): string[] {
  const families = new Set<string>();
  let match: RegExpExecArray | null;

  const styleBlock = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  while ((match = styleBlock.exec(html)) !== null) {
    collectFromCss(match[1], families);
  }

  // Inline styles are pulled out as whole attribute values first. The
  // attribute's own delimiter marks where the value ends, which is what makes
  // a quoted family name inside it unambiguous.
  const styleAttribute = /\bstyle\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
  while ((match = styleAttribute.exec(html)) !== null) {
    collectFromCss(match[1] ?? match[2] ?? "", families);
  }

  return Array.from(families);
}

/**
 * Whether the slide renders any italic text, and therefore needs the italic
 * cut of its fonts rather than a browser-synthesised slant.
 */
export function usesItalic(html: string): boolean {
  if (/font-style\s*:\s*(italic|oblique)/i.test(html)) return true;
  // `<i` must not match `<img`, `<input` or `<iframe`; `<em` must not match
  // `<embed`.
  return /<(?:em|i)(?=[\s/>])/i.test(html);
}

/**
 * Builds a Google Fonts CSS2 request for one family.
 *
 * Roman and italic are separate requests on purpose. Google answers 400 for the
 * `ital` axis on a family that has no italic design (Bebas Neue and Anton, for
 * example), and one rejected family fails an entire combined request. Asking
 * separately means a family without italics still gets its upright faces.
 */
export function googleFontsUrl(
  family: string,
  options: { italic?: boolean; display?: string } = {}
): string {
  const display = options.display ?? "swap";
  const axis = options.italic
    ? `ital,wght@${FONT_WEIGHTS.map((w) => `1,${w}`).join(";")}`
    : `wght@${FONT_WEIGHTS.join(";")}`;
  return `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
    family
  )}:${axis}&display=${display}`;
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

/**
 * Wraps slide body HTML into a full HTML document at the correct dimensions.
 * This is THE shared rendering contract between preview (iframe) and export
 * (Puppeteer).
 */
export function wrapSlideHtml(
  slideHtml: string,
  aspectRatio: AspectRatio,
  options?: { inlineFontCss?: string }
): string {
  const { width, height } = DIMENSIONS[aspectRatio];

  let fontBlock = "";
  if (options?.inlineFontCss) {
    // For export: self-contained base64 @font-face CSS, no network needed.
    fontBlock = `<style>${options.inlineFontCss}</style>`;
  } else {
    // For preview: one stylesheet per family, plus a separate italic sheet when
    // the slide needs one. A stylesheet the browser cannot fetch is ignored, so
    // a family without an italic design still renders its upright faces.
    const families = extractFontFamilies(slideHtml);
    const italic = usesItalic(slideHtml);
    fontBlock = families
      .flatMap((family) => {
        const links = [googleFontsUrl(family)];
        if (italic) links.push(googleFontsUrl(family, { italic: true }));
        return links;
      })
      .map((href) => `<link href="${escapeAttribute(href)}" rel="stylesheet">`)
      .join("\n  ");
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=${width}, initial-scale=1">
  ${fontBlock}
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: ${width}px; height: ${height}px; overflow: hidden; }
  </style>
</head>
<body>
  ${slideHtml}
</body>
</html>`;
}
