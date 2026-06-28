import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseFirmware, compareVersion } from './firmware';

describe('firmware', () => {
  it('parses W96P_V1.1.up', async () => {
    const path = resolve(__dirname, '../../../W96P_V1.1.up');
    const buf = await readFile(path);
    const fw = parseFirmware(buf.buffer as ArrayBuffer);

    expect(fw).not.toBeNull();
    expect(fw!.productName).toBe('W96P');
    expect(fw!.version.length).toBeGreaterThan(0);
    expect(fw!.rawData.length).toBeGreaterThan(0);
    expect(fw!.fileSize).toBe(buf.length);
  });

  it('returns null for garbage data', () => {
    const garbage = new Uint8Array(256).fill(0xff).buffer as ArrayBuffer;
    expect(parseFirmware(garbage)).toBeNull();
  });

  it('compareVersion correctly compares versions', () => {
    expect(compareVersion('V1.0', 'V1.1')).toBe(1);
    expect(compareVersion('V2.0', 'V1.9')).toBe(-1);
    expect(compareVersion('V1.1', 'V1.1')).toBe(0);
    expect(compareVersion('unknown', 'V1.0')).toBe(1);
  });
});
