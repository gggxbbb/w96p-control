import { describe, it, expect } from 'vitest';
import { computeGear } from './GearChips';

describe('GearChips computeGear', () => {
  it('returns 0 when speed is 0', () => {
    expect(computeGear(0, [20, 40, 60, 80], false)).toBe(0);
  });

  it('returns closest gear index', () => {
    expect(computeGear(35, [20, 40, 60, 80], false)).toBe(2);
    expect(computeGear(55, [20, 40, 60, 80], false)).toBe(3);
  });

  it('returns 0 in nature wind mode', () => {
    expect(computeGear(60, [20, 40, 60, 80], true)).toBe(0);
  });
});
