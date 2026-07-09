import { describe, it, expect } from 'vitest';
import { angleToValue, valueToAngle, clamp, pointToAngle } from './FanDial';

function rect(left: number, top: number, size: number): DOMRect {
  return new DOMRect(left, top, size, size);
}

describe('FanDial math', () => {
  it('clamps value between min and max', () => {
    expect(clamp(120, 0, 100)).toBe(100);
    expect(clamp(-10, 0, 100)).toBe(0);
    expect(clamp(45, 0, 100)).toBe(45);
  });

  it('maps value to angle', () => {
    expect(valueToAngle(0, 0, 100)).toBe(0);
    expect(valueToAngle(100, 0, 100)).toBe(270);
    expect(valueToAngle(50, 0, 100)).toBe(135);
  });

  it('maps angle to value', () => {
    expect(angleToValue(0, 0, 100)).toBe(0);
    expect(angleToValue(270, 0, 100)).toBe(100);
    expect(angleToValue(135, 0, 100)).toBe(50);
  });

  it('maps pointer position to active arc angle', () => {
    const r = rect(0, 0, 200); // center (100,100)
    // bottom-left -> 0, top -> 135, bottom-right -> 270
    expect(pointToAngle(20, 180, r)).toBeCloseTo(0, 0);
    expect(pointToAngle(100, 10, r)).toBeCloseTo(135, 0);
    expect(pointToAngle(180, 180, r)).toBeCloseTo(270, 0);
  });
});
