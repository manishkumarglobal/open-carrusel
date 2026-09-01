import { describe, it, expect } from "vitest";
import { describeExportFailure } from "@/lib/export-slides";
import { safeZoneGeometry } from "@/components/editor/SafeZoneOverlay";
import { DIMENSIONS } from "@/types/carousel";
import type { AspectRatio } from "@/types/carousel";

describe("describeExportFailure", () => {
  it("names the repair step when Chromium cannot start", () => {
    // This is the failure that previously showed the user nothing at all.
    const message = describeExportFailure(
      new Error(
        "Could not find Chrome (ver. 131.0.6778.85). This can occur if either\n" +
          " 1. you did not perform an installation before running the script"
      )
    );
    expect(message).toContain("npx puppeteer browsers install chrome");
  });

  it("recognises the other ways Puppeteer words a missing browser", () => {
    const wordings = [
      "Failed to launch the browser process!",
      // Observed live from Puppeteer 24 with a configured path that is absent.
      "Tried to find the browser at the configured path (/nonexistent/path/to/chrome), but no executable was found.",
      "Browser was not found at the configured executablePath",
      "The browser is not downloaded. Run: npx puppeteer browsers install",
    ];
    for (const wording of wordings) {
      expect(describeExportFailure(new Error(wording))).toContain(
        "npx puppeteer browsers install chrome"
      );
    }
  });

  it("explains a render timeout", () => {
    const timeout = new Error("Navigation timeout of 20000 ms exceeded");
    timeout.name = "TimeoutError";
    expect(describeExportFailure(timeout)).toMatch(/timed out/i);
  });

  it("explains a full disk and exhausted memory", () => {
    expect(describeExportFailure(new Error("ENOSPC: no space left"))).toMatch(
      /disk space/i
    );
    expect(describeExportFailure(new Error("ENOMEM"))).toMatch(/memory/i);
  });

  it("falls back to a safe summary for anything unrecognised", () => {
    expect(describeExportFailure(new Error("kaboom"))).toBe(
      "The export failed while rendering slides. See the server console for details."
    );
    expect(describeExportFailure("not an error object")).toBe(
      "The export failed while rendering slides. See the server console for details."
    );
  });

  it("never leaks a stack trace or a filesystem path", () => {
    const err = new Error(
      "spawn /Users/someone/.cache/puppeteer/chrome/mac-131/chrome ENOENT"
    );
    err.stack =
      "Error: spawn ENOENT\n    at /Users/someone/git/secret-project/node_modules/puppeteer/lib/x.js:12:9";

    for (const input of [err, new Error("totally unexpected /Users/someone/x")]) {
      const message = describeExportFailure(input);
      expect(message).not.toContain("/Users/");
      expect(message).not.toContain("node_modules");
      expect(message).not.toContain("    at ");
    }
  });
});

describe("safe zone geometry", () => {
  const ratios: AspectRatio[] = ["1:1", "4:5", "9:16"];

  it("derives the grid crop from the slide's own proportions", () => {
    for (const ratio of ratios) {
      const { width, height } = DIMENSIONS[ratio];
      const expected = height > width ? ((height - width) / 2 / height) * 100 : 0;
      expect(safeZoneGeometry(ratio).gridCropPercent).toBeCloseTo(expected, 6);
    }
  });

  it("crops nothing on a square slide and a fifth of a story slide", () => {
    expect(safeZoneGeometry("1:1").gridCropPercent).toBe(0);
    // 4:5 -> (1350-1080)/2/1350, 9:16 -> (1920-1080)/2/1920
    expect(safeZoneGeometry("4:5").gridCropPercent).toBeCloseTo(10, 6);
    expect(safeZoneGeometry("9:16").gridCropPercent).toBeCloseTo(21.875, 6);
  });

  it("leaves the two grid-crop bands plus the safe rectangle inside the slide", () => {
    for (const ratio of ratios) {
      const { gridCropPercent, safeInset } = safeZoneGeometry(ratio);
      expect(gridCropPercent * 2).toBeLessThan(100);
      expect(safeInset.top + safeInset.bottom).toBeLessThan(100);
      expect(safeInset.left + safeInset.right).toBeLessThan(100);
    }
  });

  it("keeps the safe rectangle clear of the bottom UI overlay", () => {
    for (const ratio of ratios) {
      const { bottomUiPercent, safeInset } = safeZoneGeometry(ratio);
      expect(safeInset.bottom).toBeGreaterThan(bottomUiPercent);
    }
  });
});
