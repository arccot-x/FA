export type TutorialRect = { x: number; y: number; width: number; height: number };

const TOOLTIP_GAP = 16;
const TOOLTIP_SCREEN_MARGIN = 24;
const TOOLTIP_HEIGHT_ESTIMATE = 230;

// Picks whichever side of the spotlight (above/below) has more room, then clamps
// so the tooltip never overlaps the highlighted rect or runs off-screen. Uses the
// measured tooltip height once known (onLayout), and a conservative estimate before that.
export function computeTooltipTop(rect: TutorialRect, size: { width: number; height: number }, measuredHeight: number) {
  const estimatedHeight = measuredHeight > 0 ? measuredHeight : TOOLTIP_HEIGHT_ESTIMATE;
  const spaceBelow = size.height - (rect.y + rect.height) - TOOLTIP_GAP - TOOLTIP_SCREEN_MARGIN;
  const spaceAbove = rect.y - TOOLTIP_GAP - TOOLTIP_SCREEN_MARGIN;
  const placeBelow = spaceBelow >= estimatedHeight || spaceBelow >= spaceAbove;
  return placeBelow
    ? Math.min(rect.y + rect.height + TOOLTIP_GAP, size.height - estimatedHeight - TOOLTIP_SCREEN_MARGIN)
    : Math.max(TOOLTIP_SCREEN_MARGIN, rect.y - TOOLTIP_GAP - estimatedHeight);
}

// Traces a rounded-rectangle outline so the dimmed overlay's cutout has the
// same smooth corners as the accent spotlight border drawn on top of it.
export function roundedRectPath(x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  return `M${x + r} ${y}H${x + width - r}A${r} ${r} 0 0 1 ${x + width} ${y + r}V${y + height - r}A${r} ${r} 0 0 1 ${x + width - r} ${y + height}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + height - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
}
