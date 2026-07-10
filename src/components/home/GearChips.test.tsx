import { describe, it, expect } from 'vitest';
import { inferGear } from '../../lib/gear';

describe('inferGear', () => {
  it('returns 0 when speed is 0', () => {
    expect(inferGear(0, [20, 40, 60, 80], false)).toBe(0);
  });

  it('returns closest gear index', () => {
    expect(inferGear(35, [20, 40, 60, 80], false)).toBe(2);
    expect(inferGear(55, [20, 40, 60, 80], false)).toBe(3);
  });

  it('returns 0 in nature wind mode', () => {
    expect(inferGear(60, [20, 40, 60, 80], true)).toBe(0);
  });
});
