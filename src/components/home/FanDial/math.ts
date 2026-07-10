export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function valueToAngle(value: number, min: number, max: number): number {
  const ratio = (clamp(value, min, max) - min) / (max - min || 1);
  return ratio * 270;
}

export function angleToValue(angle: number, min: number, max: number): number {
  const ratio = clamp(angle, 0, 270) / 270;
  return Math.round(min + ratio * (max - min));
}

/**
 * Convert pointer position to a 0–270 degree value space.
 *
 * The active arc runs counter-clockwise from the bottom-left ( atan2 135° )
 * through the top ( atan2 270° ) to the bottom-right ( atan2 45° ).
 *
 * The inactive region is the lower arc between 45° and 135°; pointer
 * positions there snap to the nearest endpoint (0 or 270) so the value
 * never jumps to an intermediate number while the thumb crosses the gap.
 */
export function pointToAngle(clientX: number, clientY: number, rect: DOMRect): number {
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const dx = clientX - cx;
  const dy = clientY - cy;
  const a = (Math.atan2(dy, dx) * (180 / Math.PI) + 360) % 360;
  let mapped: number;
  if (a >= 135) {
    mapped = a - 135;
  } else if (a <= 45) {
    mapped = a + 225;
  } else {
    // Inactive lower arc: snap to nearest endpoint
    mapped = a < 90 ? 270 : 0;
  }
  return mapped;
}
