import { describe, it, expect } from "vitest";
import {
  extractFontFamilies,
  usesItalic,
  googleFontsUrl,
  wrapSlideHtml,
} from "@/lib/slide-html";

describe("extractFontFamilies", () => {
  // The single-quoted-with-fallback form is what the system prompt teaches the
  // AI to write, and it is the form the previous implementation missed
  // entirely, so every real slide rendered in a system fallback instead of the
  // brand font.
  const cases: [string, string, string[]][] = [
    [
      "single-quoted with fallback",
      `<div style="font-family: 'Cormorant Garamond', serif">x</div>`,
      ["Cormorant Garamond"],
    ],
    [
      "double-quoted with fallback",
      `<div style='font-family: "Cormorant Garamond", serif'>x</div>`,
      ["Cormorant Garamond"],
    ],
    [
      "unquoted with fallback",
      `<div style="font-family: Cormorant Garamond, serif">x</div>`,
      ["Cormorant Garamond"],
    ],
    [
      "single-quoted, no fallback",
      `<div style="font-family: 'Inter'">x</div>`,
      ["Inter"],
    ],
    [
      "double-quoted, no fallback",
      `<div style='font-family: "Inter"'>x</div>`,
      ["Inter"],
    ],
    ["unquoted, no fallback", `<div style="font-family: Inter">x</div>`, ["Inter"]],
    [
      "style block, single-quoted with fallback",
      `<style>h1 { font-family: 'Playfair Display', serif; }</style>`,
      ["Playfair Display"],
    ],
    [
      "style block, double-quoted with fallback",
      `<style>h1 { font-family: "Playfair Display", serif }</style>`,
      ["Playfair Display"],
    ],
    [
      "style block, unquoted, last declaration in rule",
      `<style>h1 { color: red; font-family: Playfair Display, serif }</style>`,
      ["Playfair Display"],
    ],
    [
      "no space after colon",
      `<div style="font-family:'Inter',sans-serif">x</div>`,
      ["Inter"],
    ],
    [
      "declaration followed by another declaration",
      `<div style="font-family: 'Inter', sans-serif; font-size: 72px">x</div>`,
      ["Inter"],
    ],
  ];

  for (const [name, html, expected] of cases) {
    it(`extracts from ${name}`, () => {
      expect(extractFontFamilies(html)).toEqual(expected);
    });
  }

  it("keeps every distinct family and drops generic keywords", () => {
    const html = `
      <style>h1 { font-family: 'Cormorant Garamond', serif; }</style>
      <p style="font-family: 'Inter', sans-serif">a</p>
      <p style="font-family: Inter, system-ui, monospace">b</p>
      <p style="font-family: inherit">c</p>
    `;
    expect(extractFontFamilies(html).sort()).toEqual([
      "Cormorant Garamond",
      "Inter",
    ]);
  });

  it("finds nothing when no family is declared", () => {
    expect(extractFontFamilies("<div>plain</div>")).toEqual([]);
  });

  it("reads the families used by a real generated slide", () => {
    const slide = `<div style="width:1080px;height:1350px;background:#F7F4EF;padding:90px;display:flex;flex-direction:column;justify-content:center">
      <h1 style="font-family:'Cormorant Garamond',serif;font-size:96px;font-weight:300;color:#2E2E2E">You're not lazy.</h1>
      <p style="font-family:'Inter',sans-serif;font-size:26px;color:#8A8A8A">Why women are tired all the time</p>
    </div>`;
    expect(extractFontFamilies(slide).sort()).toEqual([
      "Cormorant Garamond",
      "Inter",
    ]);
  });
});

describe("usesItalic", () => {
  it("detects an italic font-style declaration", () => {
    expect(usesItalic(`<span style="font-style: italic">x</span>`)).toBe(true);
    expect(usesItalic(`<style>em { font-style:oblique; }</style>`)).toBe(true);
  });

  it("detects italic markup", () => {
    expect(usesItalic("<em>x</em>")).toBe(true);
    expect(usesItalic("<i>x</i>")).toBe(true);
    expect(usesItalic('<i class="icon"></i>')).toBe(true);
  });

  it("does not mistake other tags for italics", () => {
    expect(usesItalic('<img src="/uploads/a.png">')).toBe(false);
    expect(usesItalic('<input value="x">')).toBe(false);
    expect(usesItalic("<iframe></iframe>")).toBe(false);
    expect(usesItalic("<embed>")).toBe(false);
    expect(usesItalic(`<div style="font-style: normal">x</div>`)).toBe(false);
  });
});

describe("googleFontsUrl", () => {
  it("requests weights for the upright cut", () => {
    const url = googleFontsUrl("Cormorant Garamond");
    expect(url).toContain("family=Cormorant%20Garamond");
    expect(url).toContain("wght@300;400;500;600;700;800");
    expect(url).not.toContain("ital");
  });

  it("requests only italic entries for the italic cut", () => {
    const url = googleFontsUrl("Inter", { italic: true });
    expect(url).toContain("ital,wght@1,300;1,400;1,500;1,600;1,700;1,800");
  });

  it("can request a specific font-display strategy", () => {
    expect(googleFontsUrl("Inter", { display: "block" })).toContain(
      "display=block"
    );
  });
});

describe("wrapSlideHtml font loading", () => {
  const slide = `<h1 style="font-family: 'Cormorant Garamond', serif">Hook</h1>`;

  it("links a stylesheet for the family the slide declares", () => {
    const doc = wrapSlideHtml(slide, "4:5");
    expect(doc).toContain("fonts.googleapis.com");
    expect(doc).toContain("family=Cormorant%20Garamond");
  });

  it("requests one stylesheet per family so one rejection cannot break the rest", () => {
    const twoFamilies = `
      <h1 style="font-family: 'Cormorant Garamond', serif">a</h1>
      <p style="font-family: 'Inter', sans-serif">b</p>`;
    const doc = wrapSlideHtml(twoFamilies, "4:5");
    expect(doc.match(/<link /g)).toHaveLength(2);
  });

  it("adds an italic stylesheet only when the slide renders italics", () => {
    expect(wrapSlideHtml(slide, "4:5")).not.toContain("ital,wght");

    const italicSlide = `<h1 style="font-family: 'Cormorant Garamond', serif"><em>Hook</em></h1>`;
    const doc = wrapSlideHtml(italicSlide, "4:5");
    expect(doc).toContain("ital,wght");
    expect(doc.match(/<link /g)).toHaveLength(2);
  });

  it("escapes the ampersands in stylesheet URLs", () => {
    const doc = wrapSlideHtml(slide, "4:5");
    expect(doc).toContain("&amp;display=swap");
  });

  it("uses inlined CSS instead of network links when exporting", () => {
    const doc = wrapSlideHtml(slide, "4:5", {
      inlineFontCss: "@font-face{font-family:'Cormorant Garamond';src:url(data:font/woff2;base64,AA)}",
    });
    expect(doc).not.toContain("fonts.googleapis.com");
    expect(doc).toContain("@font-face");
  });

  it("still applies the aspect ratio's exact pixel dimensions", () => {
    const doc = wrapSlideHtml(slide, "9:16");
    expect(doc).toContain("width: 1080px");
    expect(doc).toContain("height: 1920px");
  });
});
