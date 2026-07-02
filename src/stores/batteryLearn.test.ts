import { beforeEach, describe, expect, it } from 'vitest';

const storage = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (k: string) => storage.get(k) ?? null,
    setItem: (k: string, v: string) => storage.set(k, v),
    removeItem: (k: string) => storage.delete(k),
    clear: () => storage.clear(),
    key: (i: number) => [...storage.keys()][i] ?? null,
    get length() { return storage.size; },
  },
});

const { useBatteryLearnStore, buildCumulativeCurve } = await import('./batteryLearn');
const SERIAL = 'abc', CAP = 18000;

describe('battery learn (transitions)', () => {
  beforeEach(() => { storage.clear(); useBatteryLearnStore.setState({ devices: {}, dialogOpen: false }); });

  it('首次进入初始化方向，不产生转移', () => {
    useBatteryLearnStore.getState().tick(SERIAL, CAP, 3700, 1000, false, 60, 1000);
    const d = useBatteryLearnStore.getState().devices[SERIAL]!;
    expect(d.pendingFromMv).toBe(3700);
    expect(d.dischargeTransitions).toHaveLength(0);
  });

  it('同 mV 累积不产生转移', () => {
    const t = useBatteryLearnStore.getState().tick;
    t(SERIAL, CAP, 3700, 1000, false, 60, 1000);
    t(SERIAL, CAP, 3700, 1000, false, 60, 2000);
    const d = useBatteryLearnStore.getState().devices[SERIAL]!;
    expect(d.dischargeTransitions).toHaveLength(0);
    expect(d.pendingMwh).toBeGreaterThan(0);
  });

  it('mV 变化产生转移 (from→to)', () => {
    const t = useBatteryLearnStore.getState().tick;
    t(SERIAL, CAP, 3700, 1000, false, 60, 1000);  // init 3700
    t(SERIAL, CAP, 3699, 1000, false, 60, 2000);  // → 3699

    const d = useBatteryLearnStore.getState().devices[SERIAL]!;
    expect(d.dischargeTransitions).toHaveLength(1);
    expect(d.dischargeTransitions[0]!.fromMv).toBe(3700);
    expect(d.dischargeTransitions[0]!.toMv).toBe(3699);
    expect(d.dischargeTransitions[0]!.mwh).toBeGreaterThan(0);
  });

  it('电压跳变 (jitter 跳过中间 mV) 直接记录 from→to', () => {
    const t = useBatteryLearnStore.getState().tick;
    t(SERIAL, CAP, 3703, 1000, false, 60, 1000);
    t(SERIAL, CAP, 3700, 1000, false, 60, 2000);  // 跳过 3702, 3701

    const d = useBatteryLearnStore.getState().devices[SERIAL]!;
    expect(d.dischargeTransitions).toHaveLength(1);
    const tr = d.dischargeTransitions[0]!;
    expect(tr.fromMv).toBe(3703);
    expect(tr.toMv).toBe(3700);
    expect(tr.mwh).toBeGreaterThan(0);
  });

  it('方向反转丢弃 pending', () => {
    const t = useBatteryLearnStore.getState().tick;
    t(SERIAL, CAP, 3700, 1000, false, 60, 1000);   // → 3700
    t(SERIAL, CAP, 3699, 1000, false, 60, 2000);   // → 转 (3700→3699)
    t(SERIAL, CAP, 3701, 1000, false, 60, 3000);   // 反转 → 丢弃 3699→3701 pending
    t(SERIAL, CAP, 3702, 1000, false, 60, 4000);   // → 转 (3701→3702)

    const d = useBatteryLearnStore.getState().devices[SERIAL]!;
    expect(d.dischargeTransitions).toHaveLength(2);
    expect(d.dischargeTransitions[0]!.fromMv).toBe(3700);
    expect(d.dischargeTransitions[0]!.toMv).toBe(3699);
    expect(d.dischargeTransitions[1]!.fromMv).toBe(3701);
    expect(d.dischargeTransitions[1]!.toMv).toBe(3702);
  });

  it('充放电状态变更+同mV → 丢弃pending', () => {
    const t = useBatteryLearnStore.getState().tick;
    t(SERIAL, CAP, 3700, 1000, false, 60, 1000);   // 放电, pending 起始
    t(SERIAL, CAP, 3700, 1000, true, 50, 2000);     // 充电, 同mV → 丢弃放电pending
    t(SERIAL, CAP, 3701, 1000, true, 50, 3000);     // 充电, mV变化 → 提交充电转移
    const d = useBatteryLearnStore.getState().devices[SERIAL]!;
    expect(d.chargeTransitions).toHaveLength(1);
    expect(d.chargeTransitions[0]!.fromMv).toBe(3700);
    expect(d.dischargeTransitions).toHaveLength(0);
  });

  it('充放电状态变更+跨mV → 旧状态提交', () => {
    const t = useBatteryLearnStore.getState().tick;
    t(SERIAL, CAP, 3700, 1000, false, 60, 1000);   // 放电, pending 起始
    t(SERIAL, CAP, 3699, 1000, false, 60, 2000);    // 放电, mV变 → 提交 (3700→3699)
    t(SERIAL, CAP, 3698, 1000, false, 60, 3000);    // 放电, mV变 → 提交 (3699→3698), pending 归零
    t(SERIAL, CAP, 3699, 500, true, 50, 4000);      // 充电+跨mV → 旧pending=0, 当前delta归新pending
    const d = useBatteryLearnStore.getState().devices[SERIAL]!;
    expect(d.dischargeTransitions).toHaveLength(3);
    expect(d.dischargeTransitions[2]!.fromMv).toBe(3698);
    expect(d.dischargeTransitions[2]!.toMv).toBe(3699);
    expect(d.pendingIsCharging).toBe(true);
  });

  it('充电写入 chargeTransitions', () => {
    const t = useBatteryLearnStore.getState().tick;
    t(SERIAL, CAP, 3800, 500, true, 40, 1000);
    t(SERIAL, CAP, 3801, 500, true, 40, 2000);
    const d = useBatteryLearnStore.getState().devices[SERIAL]!;
    expect(d.chargeTransitions).toHaveLength(1);
    expect(d.dischargeTransitions).toHaveLength(0);
  });

  it('满充检测', () => {
    const t = useBatteryLearnStore.getState().tick;
    for (let mv = 4000; mv >= 3700; mv--) t(SERIAL, CAP, mv, 2000, false, 60, (4000 - mv) * 100);
    for (let mv = 3701; mv <= 4100; mv++) t(SERIAL, CAP, mv, 500, true, 50, 50000 + mv * 100);
    t(SERIAL, CAP, 4170, 100, true, 99, 120000);
    const d = useBatteryLearnStore.getState().devices[SERIAL]!;
    expect(d.cycleCount).toBe(1);
  });

  it('累积曲线可构建', () => {
    const t = useBatteryLearnStore.getState().tick;
    for (let mv = 4000; mv >= 3700; mv--) t(SERIAL, CAP, mv, 2000, false, 60, (4000 - mv) * 100);
    const d = useBatteryLearnStore.getState().devices[SERIAL]!;
    expect(d.dischargeTransitions.length).toBeGreaterThan(0);
    const curve = buildCumulativeCurve(d.dischargeTransitions, CAP);
    expect(curve.length).toBeGreaterThan(0);
  });

  it('reset / 导出 / 导入', () => {
    const t = useBatteryLearnStore.getState().tick;
    t(SERIAL, CAP, 3700, 1000, false, 60, 1000);
    t(SERIAL, CAP, 3699, 1000, false, 60, 2000);
    const j = useBatteryLearnStore.getState().exportData(SERIAL);
    expect(j).toBeTruthy();
    const r = useBatteryLearnStore.getState().importData('xyz', j!);
    expect(r.ok).toBe(true);
    useBatteryLearnStore.getState().resetDevice(SERIAL);
    expect(useBatteryLearnStore.getState().devices[SERIAL]).toBeUndefined();
  });
});
