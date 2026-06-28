import { describe, it, expect } from 'vitest';
import { BlePackageProtocol, PACKAGE_HEAD } from './packageProtocol';

describe('BlePackageProtocol', () => {
  it('pack and round-trip in debug mode', () => {
    const proto = new BlePackageProtocol(true); // debug: key=0
    const payload = new Uint8Array([0x0a]); // GET_VERSION
    const frame = proto.pack(payload);

    expect(frame[0]).toBe(PACKAGE_HEAD);       // 0x55
    expect(frame[1]).toBe(0x00);                // debug key
    expect(frame[2]).toBe(0x01);                // len low
    expect(frame[3]).toBe(0x00);                // len high

    const results = proto.onReceive(frame);
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual(payload);
  });

  it('pack and round-trip with non-zero key', () => {
    const proto = new BlePackageProtocol(false);
    const payload = new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05]);

    // Force key to 42 for deterministic test
    (proto as any).selectTxKey = () => 42;

    const frame = proto.pack(payload);
    expect(frame[1]).toBe(42);

    const results = proto.onReceive(frame);
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual(payload);
  });

  it('rejects invalid payload length', () => {
    const proto = new BlePackageProtocol();
    expect(() => proto.pack(new Uint8Array(0))).toThrow();
    expect(() => proto.pack(new Uint8Array(301))).toThrow();
  });

  it('handles byte streaming across multiple onReceive calls', () => {
    const proto = new BlePackageProtocol(true);
    const payload = new Uint8Array([0x0f]); // GET_SN
    const frame = proto.pack(payload);

    // Feed one byte at a time
    for (let i = 0; i < frame.length - 1; i++) {
      const r = proto.onReceive(new Uint8Array([frame[i]!]));
      expect(r).toHaveLength(0);
    }
    const r = proto.onReceive(new Uint8Array([frame[frame.length - 1]!]));
    expect(r).toHaveLength(1);
    expect(r[0]).toEqual(payload);
  });

  it('resets on bad frame length', () => {
    const proto = new BlePackageProtocol(true);
    // HEAD + KEY + LEN(0xffff) — length too large
    const bad = new Uint8Array([0x55, 0x00, 0xff, 0xff]);
    const r = proto.onReceive(bad);
    expect(r).toHaveLength(0);
    // Should be back in WAIT_HEAD (stage 0)
    expect((proto as any).rxStage).toBe(0);
  });
});
