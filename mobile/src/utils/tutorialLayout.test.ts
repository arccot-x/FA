import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeTooltipTop } from "./tutorialLayout";

const size = { width: 390, height: 844 };

describe("tutorial tooltip positioning", () => {
  it("places the tooltip above a bottom-anchored spotlight without overlapping it", () => {
    // Mirrors the Home "quick add" FAB step: a small target near the bottom edge.
    const rect = { x: size.width - 96, y: size.height - 112, width: 78, height: 78 };
    const top = computeTooltipTop(rect, size, 0);
    const estimatedHeight = 230;
    assert.ok(top + estimatedHeight <= rect.y, "tooltip must not overlap the spotlight");
    assert.ok(top >= 24, "tooltip must stay within the top screen margin");
  });

  it("places the tooltip below a top-anchored spotlight", () => {
    const rect = { x: 16, y: 108, width: size.width - 32, height: 150 };
    const top = computeTooltipTop(rect, size, 0);
    assert.equal(top, rect.y + rect.height + 16);
  });

  it("uses the measured height once available instead of the estimate", () => {
    const rect = { x: 16, y: 500, width: size.width - 32, height: 100 };
    const measuredHeight = 180;
    const top = computeTooltipTop(rect, size, measuredHeight);
    assert.ok(top + measuredHeight <= rect.y || top >= rect.y + rect.height);
  });

  it("never places the tooltip off the bottom of the screen", () => {
    const rect = { x: 16, y: 40, width: size.width - 32, height: 60 };
    const top = computeTooltipTop(rect, size, 300);
    assert.ok(top + 300 <= size.height - 24 + 1);
  });
});
