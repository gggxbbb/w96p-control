import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SOC_TABLE } from '../utils/battery';

/* ── 类型 ── */

/** 电压转移记录: 从 fromMv 到 toMv 消耗的 mWh */
export interface TransitionEntry {
  fromMv: number;
  toMv: number;
  mwh: number;
}

/** 累积曲线上的一个点 */
export interface CurvePoint {
  voltageMv: number;
  remainingMwh: number;
  fromData: boolean;
}

/** 单台设备的学习数据 */
export interface DeviceLearnData {
  _version: 2;
  configuredCapacityMwh: number;
  chargeEfficiency: number;
  calibrated: boolean;
  cycleCount: number;
  state: 'idle' | 'tracking' | 'paused';
  /** 放电转移记录 */
  dischargeTransitions: TransitionEntry[];
  /** 充电转移记录 */
  chargeTransitions: TransitionEntry[];
  learnedCapacityMwh: number;
  lastTickTs: number;
  lastDeltaMwh: number;
  /** 当前方向的起始 mV */
  pendingFromMv: number;
  /** 当前方向累积未提交的能量 */
  pendingMwh: number;
  /** 当前电压方向: 1=上升, -1=下降, 0=未知 */
  direction: number;
  /** pending 段的充放电状态 */
  pendingIsCharging: boolean;
}

/* ── 常量 ── */

const VERSION = 2 as const;
const DEFAULT_EFFICIENCY = 0.92;
const MIN_CURRENT_MA = 10;
const MAX_DT_SEC = 60;
const FULL_CHARGE_VOLTAGE_MV = 4100;
const FULL_CHARGE_CURRENT_MA = 500;
const EFF_SMOOTHING = 0.25;

function createDeviceData(capacityMwh: number): DeviceLearnData {
  return {
    _version: VERSION,
    configuredCapacityMwh: capacityMwh,
    chargeEfficiency: DEFAULT_EFFICIENCY,
    calibrated: false,
    cycleCount: 0,
    state: 'idle',
    dischargeTransitions: [],
    chargeTransitions: [],
    learnedCapacityMwh: capacityMwh,
    lastTickTs: 0,
    lastDeltaMwh: 0,
    pendingFromMv: 0,
    pendingMwh: 0,
    direction: 0,
    pendingIsCharging: false,
  };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/* ── 查询：从转移记录构建累积曲线 ── */

/**
 * 从转移记录构建累积曲线
 *
 * 思路：每条转移 (fromMv→toMv, mwh) 覆盖 [min, max] 区间，
 * 将 mwh 均分到每个 mV。多条转移重叠的 mV 取 EMA 平滑。
 * 空白 mV 用 VTC6 参考斜率填充。
 */
export function buildCumulativeCurve(
  transitions: TransitionEntry[] | undefined | null,
  capacityMwh: number,
): CurvePoint[] {
  if (!transitions || transitions.length === 0) return buildRefCurve(capacityMwh);

  // 1. 每个 mV 收集所有覆盖它的转移的 mWh/mV
  const mVData = new Map<number, number[]>();

  for (const t of transitions) {
    const lo = Math.min(t.fromMv, t.toMv);
    const hi = Math.max(t.fromMv, t.toMv);
    const span = hi - lo;
    if (span === 0) continue;
    const perMv = t.mwh / span;
    for (let mv = lo; mv < hi; mv++) {
      if (!mVData.has(mv)) mVData.set(mv, []);
      mVData.get(mv)!.push(perMv);
    }
  }

  // 2. 对每个 mV 取所有覆盖值的平均
  const avgPerMv = new Map<number, number>();
  for (const [mv, vals] of mVData) {
    avgPerMv.set(mv, vals.reduce((a, b) => a + b, 0) / vals.length);
  }

  const refMin = SOC_TABLE[SOC_TABLE.length - 1]![0]!;
  const refMax = SOC_TABLE[0]![0]!;

  // 3. 从 refMin 到 refMax 构建累积曲线
  const result: CurvePoint[] = [];
  let cumulative = 0;

  for (let mv = refMin; mv <= refMax; mv++) {
    const fromData = avgPerMv.has(mv);
    cumulative += fromData
      ? avgPerMv.get(mv)!
      : refMwhPerMv(mv - 1, mv, capacityMwh);
    result.push({ voltageMv: mv, remainingMwh: cumulative, fromData });
  }

  return result;
}

function buildRefCurve(capacityMwh: number): CurvePoint[] {
  const result: CurvePoint[] = [];
  let cumulative = 0;
  const asc = [...SOC_TABLE].reverse();
  for (let i = 0; i < asc.length - 1; i++) {
    const [vLow] = asc[i]!;
    const [vHigh] = asc[i + 1]!;
    for (let mv = vLow; mv < vHigh; mv++) {
      cumulative += refMwhPerMv(mv, mv + 1, capacityMwh);
      result.push({ voltageMv: mv + 1, remainingMwh: cumulative, fromData: false });
    }
  }
  return result;
}

function refMwhPerMv(vLow: number, vHigh: number, capacityMwh: number): number {
  if (vLow >= vHigh) return 0;
  const socLow = interpolateSoc(vLow) / 100;
  const socHigh = interpolateSoc(vHigh) / 100;
  return ((socHigh - socLow) * capacityMwh) / (vHigh - vLow);
}

function interpolateSoc(mv: number): number {
  for (let i = 0; i < SOC_TABLE.length - 1; i++) {
    const [vHi, sHi] = SOC_TABLE[i]!;
    const [vLo, sLo] = SOC_TABLE[i + 1]!;
    if (mv <= vHi && mv >= vLo) {
      return sLo + ((mv - vLo) / (vHi - vLo)) * (sHi - sLo);
    }
  }
  if (mv > SOC_TABLE[0]![0]) return SOC_TABLE[0]![1];
  return SOC_TABLE[SOC_TABLE.length - 1]![1]!;
}

export function getRemaining(
  transitions: TransitionEntry[] | undefined | null,
  capacityMwh: number,
  _calibrated: boolean,
  _learnedCapacityMwh: number,
  voltageMv: number,
): number {
  const curve = buildCumulativeCurve(transitions, capacityMwh);
  if (curve.length === 0) return capacityMwh;
  let consumed = 0;
  for (const pt of curve) {
    if (pt.voltageMv <= voltageMv) consumed = pt.remainingMwh;
    else break;
  }
  // consumed = 曲线从最低电压累加到当前电压的能量 = 剩余可用能量
  return Math.max(0, Math.round(consumed));
}

export function sumDischargeBins(transitions: TransitionEntry[]): number {
  return transitions.reduce((s, t) => s + t.mwh, 0);
}

/* ── Store ── */

interface BatteryLearnState {
  devices: Record<string, DeviceLearnData>;
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
  ensureDevice: (serial: string, capacityMwh: number) => DeviceLearnData;
  tick: (
    serial: string, capacityMwh: number, voltageMv: number,
    currentMa: number, isCharging: boolean, socEstimate: number, now: number,
  ) => void;
  resetDevice: (serial: string) => void;
  setChargeEfficiency: (serial: string, eff: number) => void;
  exportData: (serial: string) => string | null;
  importData: (serial: string, json: string) => { ok: boolean; error?: string };
  mergeImportData: (serial: string, json: string) => { ok: boolean; error?: string };
  getCredibility: (serial: string) => number;
  /** 查询指定设备在某电压下的剩余容量 (mWh) */
  getRemainingMwh: (serial: string, voltageMv: number) => number | null;
}

export const useBatteryLearnStore = create<BatteryLearnState>()(
  persist(
    (set, get) => ({
      devices: {},
      dialogOpen: false,
      setDialogOpen: (open) => set({ dialogOpen: open }),

      ensureDevice: (serial, capacityMwh) => {
        const existing = get().devices[serial];
        if (existing) {
          if (existing.configuredCapacityMwh !== capacityMwh) {
            const next = createDeviceData(capacityMwh);
            set((s) => ({ devices: { ...s.devices, [serial]: next } }));
            return next;
          }
          return existing;
        }
        const next = createDeviceData(capacityMwh);
        set((s) => ({ devices: { ...s.devices, [serial]: next } }));
        return next;
      },

      tick: (serial, capacityMwh, voltageMv, currentMa, isCharging, _socEstimate, now) => {
        const d = get().ensureDevice(serial, capacityMwh);
        if (d.state === 'paused') return;

        const absCur = Math.abs(currentMa);
        if (absCur < MIN_CURRENT_MA) {
          set((s) => ({ devices: { ...s.devices, [serial]: { ...s.devices[serial]!, lastTickTs: now, lastDeltaMwh: 0 } } }));
          return;
        }

        const dtSec = d.lastTickTs > 0 ? (now - d.lastTickTs) / 1000 : 0;
        if (dtSec > MAX_DT_SEC) {
          set((s) => ({ devices: { ...s.devices, [serial]: { ...s.devices[serial]!, lastTickTs: now, lastDeltaMwh: 0 } } }));
          return;
        }

        const deltaMwh = (voltageMv * absCur * dtSec) / 3_600_000;
        const curMv = Math.round(voltageMv);

        // ── 满充检测 ──
        if (isCharging && voltageMv >= FULL_CHARGE_VOLTAGE_MV && absCur < FULL_CHARGE_CURRENT_MA) {
          const totalDis = sumDischargeBins(d.dischargeTransitions);
          const totalChg = sumDischargeBins(d.chargeTransitions);
          let newEff = d.chargeEfficiency;
          if (totalChg > 0 && totalDis > 0) {
            newEff = clamp(d.chargeEfficiency * (1 - EFF_SMOOTHING) + (totalDis / totalChg) * EFF_SMOOTHING, 0.5, 1);
          }
          set((s) => ({
            devices: {
              ...s.devices,
              [serial]: {
                ...s.devices[serial]!,
                calibrated: true,
                cycleCount: d.cycleCount + 1,
                chargeEfficiency: newEff,
                learnedCapacityMwh: Math.round(totalDis) || d.learnedCapacityMwh,
                chargeTransitions: [],
                lastTickTs: now,
                lastDeltaMwh: 0,
                pendingFromMv: 0,
                pendingMwh: 0,
                direction: 0,
                pendingIsCharging: false,
                state: 'tracking' as const,
              },
            },
          }));
          return;
        }

        // ── 转移记录 ──
        const pendingMv = d.pendingFromMv;
        if (pendingMv === 0) {
          // 首次进入：初始化方向
          set((s) => ({
            devices: {
              ...s.devices,
              [serial]: {
                ...s.devices[serial]!,
                pendingFromMv: curMv,
                pendingMwh: deltaMwh,
                direction: 0,
                pendingIsCharging: isCharging,
                lastTickTs: now,
                lastDeltaMwh: isCharging ? deltaMwh : -deltaMwh,
                state: 'tracking' as const,
              },
            },
          }));
          return;
        }

        // ── 充放电状态变化检测 ──
        if (isCharging !== d.pendingIsCharging) {
          if (curMv !== pendingMv) {
            // mV 也变了 → 旧 pending 提交到旧状态列表，当前帧能量归新状态
            const oldKey = d.pendingIsCharging ? 'chargeTransitions' : 'dischargeTransitions';
            const oldEntry: TransitionEntry = { fromMv: pendingMv, toMv: curMv, mwh: d.pendingMwh };
            set((s) => ({
              devices: {
                ...s.devices,
                [serial]: {
                  ...s.devices[serial]!,
                  [oldKey]: [...d[oldKey], oldEntry],
                  pendingFromMv: curMv,
                  pendingMwh: deltaMwh,
                  direction: 0,
                  pendingIsCharging: isCharging,
                  lastTickTs: now,
                  lastDeltaMwh: isCharging ? deltaMwh : -deltaMwh,
                  state: 'tracking' as const,
                },
              },
            }));
          } else {
            // 同 mV → 无法产生转移（span=0），丢弃 pending 重启
            set((s) => ({
              devices: {
                ...s.devices,
                [serial]: {
                  ...s.devices[serial]!,
                  pendingFromMv: curMv,
                  pendingMwh: deltaMwh,
                  direction: 0,
                  pendingIsCharging: isCharging,
                  lastTickTs: now,
                  lastDeltaMwh: isCharging ? deltaMwh : -deltaMwh,
                  state: 'tracking' as const,
                },
              },
            }));
          }
          return;
        }

        // 判断方向
        const dir = curMv > pendingMv ? 1 : curMv < pendingMv ? -1 : d.direction;

        if (dir !== 0 && d.direction !== 0 && dir !== d.direction) {
          // 方向反转 → 丢弃 pending，重新开始
          set((s) => ({
            devices: {
              ...s.devices,
              [serial]: {
                ...s.devices[serial]!,
                pendingFromMv: curMv,
                pendingMwh: deltaMwh,
                direction: dir,
                pendingIsCharging: isCharging,
                lastTickTs: now,
                lastDeltaMwh: isCharging ? deltaMwh : -deltaMwh,
                state: 'tracking' as const,
              },
            },
          }));
          return;
        }

        if (curMv === pendingMv) {
          // 同 mV，继续累积
          set((s) => ({
            devices: {
              ...s.devices,
              [serial]: {
                ...s.devices[serial]!,
                pendingMwh: d.pendingMwh + deltaMwh,
                direction: dir,
                lastTickTs: now,
                lastDeltaMwh: isCharging ? deltaMwh : -deltaMwh,
                state: 'tracking' as const,
              },
            },
          }));
          return;
        }

        // mV 变化 → 记录转移
        const commitMwh = d.pendingMwh + deltaMwh;
        const listKey = isCharging ? 'chargeTransitions' : 'dischargeTransitions';
        const entry: TransitionEntry = { fromMv: pendingMv, toMv: curMv, mwh: commitMwh };

        set((s) => ({
          devices: {
            ...s.devices,
            [serial]: {
              ...s.devices[serial]!,
              [listKey]: [...d[listKey], entry],
              pendingFromMv: curMv,
              pendingMwh: 0,
              direction: dir,
              lastTickTs: now,
              lastDeltaMwh: isCharging ? deltaMwh : -deltaMwh,
              state: 'tracking' as const,
            },
          },
        }));
      },

      resetDevice: (serial) => set((s) => { const n = { ...s.devices }; delete n[serial]; return { devices: n }; }),
      setChargeEfficiency: (serial, eff) => set((s) => {
        const d = s.devices[serial];
        return d ? { devices: { ...s.devices, [serial]: { ...d, chargeEfficiency: eff } } } : s;
      }),
      exportData: (serial) => { const d = get().devices[serial]; return d ? JSON.stringify({ [serial]: d }, null, 2) : null; },
      importData: (serial, json) => {
        try {
          const p = JSON.parse(json); const data = (p[serial] ?? p) as Record<string, unknown>;
          if (!data || typeof data !== 'object') return { ok: false, error: '格式错误' };
          set((s) => ({ devices: { ...s.devices, [serial]: migrateData(data) } }));
          return { ok: true };
        } catch (e) { return { ok: false, error: (e as Error).message }; }
      },
      mergeImportData: (serial, json) => {
        try {
          const p = JSON.parse(json); const data = (p[serial] ?? p) as Record<string, unknown>;
          if (!data || typeof data !== 'object') return { ok: false, error: '格式错误' };
          const imp = migrateData(data);
          const ext = get().devices[serial];
          if (!ext) { set((s) => ({ devices: { ...s.devices, [serial]: imp } })); return { ok: true }; }
          set((s) => ({
            devices: {
              ...s.devices,
              [serial]: {
                ...ext,
                calibrated: ext.calibrated || imp.calibrated,
                cycleCount: Math.max(ext.cycleCount, imp.cycleCount),
                dischargeTransitions: [...ext.dischargeTransitions, ...imp.dischargeTransitions],
                chargeEfficiency: (ext.chargeEfficiency + imp.chargeEfficiency) / 2,
              },
            },
          }));
          return { ok: true };
        } catch (e) { return { ok: false, error: (e as Error).message }; }
      },
      getCredibility: (serial) => {
        const d = get().devices[serial];
        if (!d) return 0;
        const ts = d.dischargeTransitions;
        if (!ts || ts.length === 0) return 0;
        const allMv = ts.flatMap((t) => [t.fromMv, t.toMv]);
        const vMin = Math.min(...allMv);
        const vMax = Math.max(...allMv);
        const covRaw = (vMax - vMin) / 1200;
        const coverage = Math.min(1, covRaw);
        const base = 12 + Math.round(coverage * 43);
        const cycB = Math.min(d.cycleCount, 4) * 8;
        const densB = Math.min(12, Math.round(ts.length / 5));
        const fresh = (Date.now() - d.lastTickTs) < 60 * 86400000 ? 1 : 0.6;
        return Math.min(100, Math.round((base + cycB + densB) * coverage * fresh));
      },
      getRemainingMwh: (serial, voltageMv) => {
        const d = get().devices[serial];
        if (!d) return null;
        const ts = d.dischargeTransitions;
        if (!ts || ts.length === 0) return null;
        return getRemaining(ts, d.configuredCapacityMwh, d.calibrated, d.learnedCapacityMwh, voltageMv);
      },
    }),
    {
      name: 'w96p-battery-learn-v2',
      merge: (persisted: unknown, current: BatteryLearnState) => {
        const parsed = persisted as { devices?: Record<string, unknown> } | undefined;
        if (!parsed?.devices) return current;
        for (const [k, d] of Object.entries(parsed.devices)) {
          parsed.devices[k] = migrateData(d as Record<string, unknown>);
        }
        return { ...current, ...(parsed as BatteryLearnState) };
      },
    },
  ),
);

function migrateData(data: Record<string, unknown>): DeviceLearnData {
  const fresh = createDeviceData((data.configuredCapacityMwh as number) ?? 18000);
  if (data._version === 2) {
    // Ensure all required arrays exist — old v2 data may be missing fields
    const d = data as Record<string, unknown>;
    return {
      ...fresh,
      ...d,
      dischargeTransitions: Array.isArray(d.dischargeTransitions) ? d.dischargeTransitions as TransitionEntry[] : [],
      chargeTransitions: Array.isArray(d.chargeTransitions) ? d.chargeTransitions as TransitionEntry[] : [],
      learnedCapacityMwh: (typeof d.learnedCapacityMwh === 'number' ? d.learnedCapacityMwh : fresh.learnedCapacityMwh) as number,
      pendingIsCharging: (typeof d.pendingIsCharging === 'boolean' ? d.pendingIsCharging : false) as boolean,
    } as DeviceLearnData;
  }
  return fresh;
}
