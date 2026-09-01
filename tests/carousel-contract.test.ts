import { describe, it, expect } from "vitest";
import { DIMENSIONS, MAX_SLIDES, MAX_VERSIONS } from "@/types/carousel";
import type { AspectRatio } from "@/types/carousel";

// The exported pixel dimensions are a product contract: Instagram rejects or
// re-compresses anything off-spec, and the same numbers drive the preview
// iframe, the export viewport, and the safe-zone overlay. A typo here would
// silently degrade every export, so pin the values.
describe("Instagram dimension contract", () => {
  it("matches Instagram's supported carousel dimensions", () => {
    expect(DIMENSIONS["1:1"]).toEqual({ width: 1080, height: 1080 });
    expect(DIMENSIONS["4:5"]).toEqual({ width: 1080, height: 1350 });
    expect(DIMENSIONS["9:16"]).toEqual({ width: 1080, height: 1920 });
  });

  it("keeps every ratio at Instagram's 1080px render width", () => {
    for (const dims of Object.values(DIMENSIONS)) {
      expect(dims.width).toBe(1080);
    }
  });

  it("declares dimensions whose ratio matches the aspect-ratio key", () => {
    for (const [ratio, dims] of Object.entries(DIMENSIONS) as [
      AspectRatio,
      { width: number; height: number },
    ][]) {
      const [w, h] = ratio.split(":").map(Number);
      expect(dims.width / dims.height).toBeCloseTo(w / h, 5);
    }
  });
});

describe("carousel limits", () => {
  it("allows a positive, whole number of slides and versions", () => {
    expect(Number.isInteger(MAX_SLIDES)).toBe(true);
    expect(MAX_SLIDES).toBeGreaterThan(0);
    expect(Number.isInteger(MAX_VERSIONS)).toBe(true);
    expect(MAX_VERSIONS).toBeGreaterThan(0);
  });
});
