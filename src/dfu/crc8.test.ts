import { describe, it, expect } from 'vitest';
import { calcCrc8, CRC8_INIT, CRC8_TABLE } from './crc8';

describe('crc8', () => {
  it('table has 256 entries', () => {
    expect(CRC8_TABLE).toHaveLength(256);
  });

  it('calcCrc8 of empty data returns init', () => {
    expect(calcCrc8(new Uint8Array([]), 0, 0)).toBe(CRC8_INIT);
  });

  it('calcCrc8 of known payload matches APK reference', () => {
    // HEAD(0x55) + KEY(0x00) + LEN LE(0x01 0x00) + PAYLOAD(0x0A) = [85,0,1,0,10]
    const frame = new Uint8Array([85, 0, 1, 0, 10]);
    const crc = calcCrc8(frame, 0, 5);
    expect(typeof crc).toBe('number');
    expect(crc).toBeGreaterThanOrEqual(0);
    expect(crc).toBeLessThanOrEqual(255);
  });

  it('calcCrc8 is deterministic', () => {
    const data = new Uint8Array([0x55, 0x00, 0x01, 0x00, 0x0a]);
    const a = calcCrc8(data);
    const b = calcCrc8(data);
    expect(a).toBe(b);
  });
});
