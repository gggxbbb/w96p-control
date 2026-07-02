import { beforeEach, describe, expect, it } from 'vitest';

const storage = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
    clear: () => storage.clear(),
    key: (index: number) => Array.from(storage.keys())[index] ?? null,
    get length() {
      return storage.size;
    },
  },
});

const { useBatteryLearnStore } = await import('./batteryLearn');

describe('battery learn store', () => {
  beforeEach(() => {
    storage.clear();
    useBatteryLearnStore.setState({ devices: {}, dialogOpen: false });
  });

  it('在充放电切换时重置当前充电段累计', () => {
    const serial = 'abc';
    const capacity = 18000;

    useBatteryLearnStore.getState().tick(serial, capacity, 3800, 1000, true, 80, 1000);
    useBatteryLearnStore.getState().tick(serial, capacity, 3800, 1000, true, 80, 2000);
    useBatteryLearnStore.getState().tick(serial, capacity, 3800, -1000, false, 70, 3000);

    const device = useBatteryLearnStore.getState().devices[serial];
    expect(device).toBeDefined();
    expect(device?.chargeRawAccumMwh).toBe(0);
    expect(device?.chargeStartRemainingMwh).toBe(device?.trackedRemainingMwh);
  });

  it('在无电流时刷新上次 tick 时间，避免旧窗口继续积分', () => {
    const serial = 'abc';
    const capacity = 18000;

    useBatteryLearnStore.getState().tick(serial, capacity, 3800, 1000, true, 80, 1000);
    useBatteryLearnStore.getState().tick(serial, capacity, 3800, 0, true, 80, 2000);

    const device = useBatteryLearnStore.getState().devices[serial];
    expect(device?.lastTickTs).toBe(2000);
  });

  it('弱证据下放电回退应更保守，避免过度相信单次估计', () => {
    const serial = 'abc';
    const capacity = 18000;

    useBatteryLearnStore.getState().tick(serial, capacity, 3800, 1000, true, 80, 1000);
    useBatteryLearnStore.getState().tick(serial, capacity, 3700, -1000, false, 60, 3000);

    const device = useBatteryLearnStore.getState().devices[serial];
    expect(device?.trackedRemainingMwh).toBeGreaterThan(16000);
    expect(device?.trackedRemainingMwh).toBeLessThan(18000);
  });
});
