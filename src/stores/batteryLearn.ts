import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SOC_TABLE } from '../utils/battery';

/** 单次采样点 */
export interface LearnSample {
  /** 电池电压 mV */
  voltageMv: number;
  /** 跟踪剩余容量 mWh */
  remainingMwh: number;
  /** 采样时间戳 */
  ts: number;
}

/** 充电 vs 放电采样分开存储 */
export interface CycleSamples {
  charge: LearnSample[];
  discharge: LearnSample[];
}

/** 单台设备的学习数据 */
export interface DeviceLearnData {
  /** 最近一次用户配置容量，用于检测容量变更 */
  configuredCapacityMwh: number;
  /** 库仑计跟踪剩余容量 mWh */
  trackedRemainingMwh: number;
  /** 充电效率（充入/消耗），初始 0.92，多次循环后拟合 */
  chargeEfficiency: number;
  /** 是否经过至少一次满充校准 */
  calibrated: boolean;
  /** 完成完整充放循环次数 */
  cycleCount: number;
  /** 当前跟踪状态 */
  state: 'idle' | 'tracking' | 'paused';
  /** 当前采样周期（charge 或 discharge）的累积采样 */
  currentCharge: LearnSample[];
  currentDischarge: LearnSample[];
  /** 已完成的完整充放循环采样 */
  completedCycles: CycleSamples[];
  /** 上次更新 tick 的时间戳 */
  lastTickTs: number;
  /** 本次充电段开始的剩余容量（用于反算充电效率） */
  chargeStartRemainingMwh: number;
  /** 本次充电段累计原始充入能量（不含效率折扣） */
  chargeRawAccumMwh: number;
  /** 上一次 tick 的 delta 能量 mWh（用于 UI 显示） */
  lastDeltaMwh: number;
}

const DEFAULT_EFFICIENCY = 0.92;
const MIN_CURRENT_MA = 10;
const MAX_DT_SEC = 60;
const FULL_CHARGE_VOLTAGE_MV = 4100;
const FULL_CHARGE_CURRENT_MA = 500;
const VOLTAGE_DRIFT_THRESHOLD_MV = 100;
const MAX_SAMPLES = 500;
const CHARGE_EFFICIENCY_SMOOTHING = 0.25;
const LOW_EVIDENCE_THRESHOLD = 0.35;
const MIN_DISCHARGE_EVIDENCE = 3;

function createDeviceData(capacityMwh: number): DeviceLearnData {
  return {
    configuredCapacityMwh: capacityMwh,
    trackedRemainingMwh: capacityMwh,
    chargeEfficiency: DEFAULT_EFFICIENCY,
    calibrated: false,
    cycleCount: 0,
    state: 'idle',
    currentCharge: [],
    currentDischarge: [],
    completedCycles: [],
    lastTickTs: 0,
    chargeStartRemainingMwh: capacityMwh,
    chargeRawAccumMwh: 0,
    lastDeltaMwh: 0,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

interface BatteryLearnState {
  /** key = serialNumber */
  devices: Record<string, DeviceLearnData>;
  /** 是否显示学习面板（仅内存） */
  dialogOpen: boolean;

  setDialogOpen: (open: boolean) => void;

  /** 获取或创建设备数据 */
  ensureDevice: (serial: string, capacityMwh: number) => DeviceLearnData;

  /** 每个 poll tick 更新 */
  tick: (
    serial: string,
    capacityMwh: number,
    voltageMv: number,
    currentMa: number,
    isCharging: boolean,
    socEstimate: number,
    now: number,
  ) => void;

  /** 手动重置某设备的学习数据 */
  resetDevice: (serial: string) => void;

  /** 更新充电效率 */
  setChargeEfficiency: (serial: string, eff: number) => void;

  /** 导出学习数据为 JSON */
  exportData: (serial: string) => string | null;

  /** 导入学习数据（覆盖指定设备的现有数据） */
  importData: (serial: string, json: string) => { ok: boolean; error?: string };

  /** 合并导入（保留双方的最佳采样） */
  mergeImportData: (serial: string, json: string) => { ok: boolean; error?: string };

  /** 计算学习数据可信度 (0~100) */
  getCredibility: (serial: string) => number;
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

      tick: (serial, capacityMwh, voltageMv, currentMa, isCharging, socEstimate, now) => {
        const device = get().ensureDevice(serial, capacityMwh);
        if (device.state === 'paused') return;

        const hasCurrent = Math.abs(currentMa) > MIN_CURRENT_MA;
        if (!hasCurrent) {
          set((s) => ({
            devices: {
              ...s.devices,
              [serial]: { ...s.devices[serial]!, lastTickTs: now, lastDeltaMwh: 0 },
            },
          }));
          return;
        }

        const prevTick = device.lastTickTs;
        const dtSec = prevTick > 0 ? (now - prevTick) / 1000 : 0;
        if (dtSec <= 0 || dtSec > MAX_DT_SEC) {
          const prevVm = lastSampleVoltage(device);
          if (prevVm > 0 && Math.abs(voltageMv - prevVm) >= VOLTAGE_DRIFT_THRESHOLD_MV) {
            const credible = get().getCredibility(serial) >= 80;
            const curve = credible ? buildVoltageToRemaining(device) : null;
            const estimated = interpolateRemaining(curve, voltageMv, capacityMwh);
            set((s) => ({
              devices: {
                ...s.devices,
                [serial]: {
                  ...s.devices[serial]!,
                  trackedRemainingMwh: clamp(estimated, 0, capacityMwh),
                  lastTickTs: now,
                  lastDeltaMwh: 0,
                },
              },
            }));
          } else {
            set((s) => ({
              devices: {
                ...s.devices,
                [serial]: { ...s.devices[serial]!, lastTickTs: now, lastDeltaMwh: 0 },
              },
            }));
          }
          return;
        }

        const absCurrentMa = Math.abs(currentMa);
        const deltaMwh = (voltageMv * absCurrentMa * dtSec) / 3_600_000;
        const previousDirection = device.lastDeltaMwh === 0 ? null : device.lastDeltaMwh > 0 ? 'charge' : 'discharge';
        const currentDirection = isCharging ? 'charge' : 'discharge';
        const directionChanged = previousDirection !== null && previousDirection !== currentDirection;

        let tracked = device.trackedRemainingMwh;
        let calibrated = device.calibrated;
        const state = 'tracking' as const;
        const evidence = getEvidenceScore(device);
        const shouldUseVoltageFallback = !calibrated && evidence < LOW_EVIDENCE_THRESHOLD;

        if (isCharging && voltageMv >= FULL_CHARGE_VOLTAGE_MV && absCurrentMa < FULL_CHARGE_CURRENT_MA) {
          tracked = capacityMwh;
          calibrated = true;

          let newEff = device.chargeEfficiency;
          if (device.chargeRawAccumMwh > 0) {
            const gained = Math.max(0, capacityMwh - device.chargeStartRemainingMwh);
            if (gained > 0) {
              const derivedEff = gained / device.chargeRawAccumMwh;
              newEff = clamp(
                device.chargeEfficiency * (1 - CHARGE_EFFICIENCY_SMOOTHING) + derivedEff * CHARGE_EFFICIENCY_SMOOTHING,
                0.5,
                1,
              );
            }
          }

          const completed: CycleSamples = {
            charge: [...device.currentCharge],
            discharge: [...device.currentDischarge],
          };
          const cleaned = [...device.completedCycles, completed].filter((c) => c.charge.length > 0 || c.discharge.length > 0);

          set((s) => ({
            devices: {
              ...s.devices,
              [serial]: {
                ...s.devices[serial]!,
                trackedRemainingMwh: capacityMwh,
                calibrated: true,
                cycleCount: device.cycleCount + 1,
                chargeEfficiency: newEff,
                chargeStartRemainingMwh: capacityMwh,
                chargeRawAccumMwh: 0,
                currentCharge: [],
                currentDischarge: [],
                completedCycles: cleaned,
                lastTickTs: now,
                lastDeltaMwh: 0,
                state,
              },
            },
          }));
          return;
        }

        if (isCharging) {
          let chargeStart = device.chargeStartRemainingMwh;
          let chargeRaw = device.chargeRawAccumMwh;
          if (directionChanged || chargeRaw === 0) {
            chargeStart = Math.round(tracked);
            chargeRaw = 0;
          }
          chargeRaw += deltaMwh;

          tracked += deltaMwh * device.chargeEfficiency;
          tracked = Math.min(tracked, capacityMwh);

          const sample: LearnSample = { voltageMv, remainingMwh: Math.round(tracked), ts: now };
          const newCharge = directionChanged
            ? clampSamples([sample])
            : clampSamples([...device.currentCharge, sample]);

          set((s) => ({
            devices: {
              ...s.devices,
              [serial]: {
                ...s.devices[serial]!,
                trackedRemainingMwh: Math.round(tracked),
                calibrated,
                chargeStartRemainingMwh: chargeStart,
                chargeRawAccumMwh: chargeRaw,
                currentCharge: newCharge,
                currentDischarge: device.currentDischarge,
                lastTickTs: now,
                lastDeltaMwh: deltaMwh,
                state,
              },
            },
          }));
          return;
        }

        tracked -= deltaMwh;
        tracked = Math.max(tracked, 0);

        const sample: LearnSample = { voltageMv, remainingMwh: Math.round(tracked), ts: now };
        const newDischarge = directionChanged
          ? clampSamples([sample])
          : clampSamples([...device.currentDischarge, sample]);

        if (shouldUseVoltageFallback) {
          const voltEstimate = (capacityMwh * socEstimate) / 100;
          const target = clamp(voltEstimate, 0, capacityMwh);
          const fallbackStrength = evidence < LOW_EVIDENCE_THRESHOLD / 2 ? 0.08 : 0.12;
          tracked = tracked + (target - tracked) * fallbackStrength;
        }

        set((s) => ({
          devices: {
            ...s.devices,
            [serial]: {
              ...s.devices[serial]!,
              trackedRemainingMwh: Math.round(tracked),
              calibrated,
              chargeStartRemainingMwh: directionChanged ? Math.round(tracked) : device.chargeStartRemainingMwh,
              chargeRawAccumMwh: directionChanged ? 0 : device.chargeRawAccumMwh,
              currentCharge: device.currentCharge,
              currentDischarge: newDischarge,
              lastTickTs: now,
              lastDeltaMwh: -deltaMwh,
              state,
            },
          },
        }));
      },

      resetDevice: (serial) => {
        set((s) => {
          const next = { ...s.devices };
          delete next[serial];
          return { devices: next };
        });
      },

      setChargeEfficiency: (serial, eff) => {
        set((s) => {
          const device = s.devices[serial];
          if (!device) return s;
          return {
            devices: {
              ...s.devices,
              [serial]: { ...device, chargeEfficiency: eff },
            },
          };
        });
      },

      exportData: (serial) => {
        const device = get().devices[serial];
        if (!device) return null;
        return JSON.stringify({ [serial]: device }, null, 2);
      },

      importData: (serial, json) => {
        try {
          const parsed = JSON.parse(json);
          const data = parsed[serial] ?? parsed;
          if (!data || typeof data !== 'object') return { ok: false, error: '格式错误：找不到设备数据' };
          _validateImport(data);
          set((s) => ({ devices: { ...s.devices, [serial]: data as DeviceLearnData } }));
          return { ok: true };
        } catch (e) {
          return { ok: false, error: e instanceof Error ? e.message : '解析失败' };
        }
      },

      mergeImportData: (serial, json) => {
        try {
          const parsed = JSON.parse(json);
          const data = parsed[serial] ?? parsed;
          if (!data || typeof data !== 'object') return { ok: false, error: '格式错误：找不到设备数据' };
          _validateImport(data);
          const imported = data as DeviceLearnData;
          const existing = get().devices[serial];
          if (!existing) {
            set((s) => ({ devices: { ...s.devices, [serial]: imported } }));
            return { ok: true };
          }
          const merged: DeviceLearnData = {
            ...existing,
            calibrated: existing.calibrated || imported.calibrated,
            cycleCount: Math.max(existing.cycleCount, imported.cycleCount),
            completedCycles: _mergeCycles(existing.completedCycles, imported.completedCycles),
            currentCharge: existing.currentCharge.length > 0 ? existing.currentCharge : imported.currentCharge,
            currentDischarge: existing.currentDischarge.length > 0 ? existing.currentDischarge : imported.currentDischarge,
            chargeEfficiency: (existing.chargeEfficiency + imported.chargeEfficiency) / 2,
          };
          set((s) => ({ devices: { ...s.devices, [serial]: merged } }));
          return { ok: true };
        } catch (e) {
          return { ok: false, error: e instanceof Error ? e.message : '解析失败' };
        }
      },

      getCredibility: (serial) => {
        const device = get().devices[serial];
        if (!device) return 0;

        const allDischarge = [
          ...device.completedCycles.flatMap((c) => c.discharge),
          ...device.currentDischarge,
        ];
        const allCharge = [
          ...device.completedCycles.flatMap((c) => c.charge),
          ...device.currentCharge,
        ];

        const base = device.calibrated ? 55 : 12;
        const cycleBonus = Math.min(device.cycleCount, 4) * 8;
        const sampleCount = allDischarge.length + allCharge.length;
        const densityBonus = Math.min(12, Math.round(sampleCount / 10));
        const dischargeEvidence = allDischarge.length >= MIN_DISCHARGE_EVIDENCE ? 1 : 0;
        const evidenceScore = Math.min(1, (base + cycleBonus + densityBonus) / 100) * (0.6 + dischargeEvidence * 0.4);

        const allVoltages = [...allDischarge, ...allCharge].map((s) => s.voltageMv);
        const vMin = allVoltages.length > 0 ? Math.min(...allVoltages) : 0;
        const vMax = allVoltages.length > 0 ? Math.max(...allVoltages) : 0;
        const coverage = allVoltages.length > 0
          ? Math.min(1, (vMax - vMin) / 1200)
          : 0;

        const latestCycle = device.completedCycles[device.completedCycles.length - 1];
        const latestTs = latestCycle
          ? Math.max(
              ...(latestCycle.charge.length > 0 ? [latestCycle.charge[latestCycle.charge.length - 1]!.ts] : []),
              ...(latestCycle.discharge.length > 0 ? [latestCycle.discharge[latestCycle.discharge.length - 1]!.ts] : []),
            )
          : 0;
        const daysSince = latestTs > 0 ? (Date.now() - latestTs) / 86400000 : 999;
        const freshness = daysSince > 60 ? 0.6 : 1.0;

        const raw = (base + cycleBonus + densityBonus) * coverage * freshness * (0.7 + evidenceScore * 0.3);
        return Math.min(100, Math.round(raw));
      },
    }),
    {
      name: 'w96p-battery-learn',
      merge: (persisted: unknown, current: BatteryLearnState) => {
        const parsed = persisted as { devices?: Record<string, DeviceLearnData> } | undefined;
        if (!parsed?.devices) return current;
        for (const [key, device] of Object.entries(parsed.devices)) {
          parsed.devices[key] = {
            ...device,
            completedCycles: device.completedCycles.filter(
              (c) => c.charge.length > 0 || c.discharge.length > 0,
            ),
          };
        }
        return { ...current, ...(parsed as BatteryLearnState) };
      },
    },
  ),
);

/** 限制采样点数，每隔 N 个保留一个 */
function clampSamples(samples: LearnSample[], maxSamples = MAX_SAMPLES): LearnSample[] {
  if (samples.length <= maxSamples) return samples;
  const step = Math.ceil(samples.length / maxSamples);
  return samples.filter((_, i) => i % step === 0);
}

/** 校验导入数据的格式 */
function _validateImport(data: unknown) {
  if (!data || typeof data !== 'object') throw new Error('数据格式错误');
}

/** 合并循环采样：按首个采样点时间戳去重 */
function _mergeCycles(existing: CycleSamples[], imported: CycleSamples[]): CycleSamples[] {
  const seen = new Set<number>();
  const result: CycleSamples[] = [];
  for (const c of [...existing, ...imported]) {
    const firstTs = c.charge[0]?.ts ?? c.discharge[0]?.ts ?? 0;
    if (firstTs > 0 && seen.has(firstTs)) continue;
    if (firstTs > 0) seen.add(firstTs);
    result.push(c);
  }
  return result;
}

/** 获取设备最后一个采样点的电压（用于 deltaV 检测） */
function lastSampleVoltage(device: DeviceLearnData): number {
  const all = [
    ...device.currentCharge,
    ...device.currentDischarge,
    ...device.completedCycles.flatMap((c) => [...c.charge, ...c.discharge]),
  ];
  if (all.length === 0) return 0;
  return all.reduce((a, b) => (a.ts > b.ts ? a : b)).voltageMv;
}

/** 从放电采样构建电压→剩余容量的排序数组（放电采样按电压降序排列） */
function buildVoltageToRemaining(device: DeviceLearnData): [number, number][] {
  const samples = [
    ...device.completedCycles.flatMap((c) => c.discharge),
    ...device.currentDischarge,
  ];
  const sorted = [...samples].sort((a, b) => b.voltageMv - a.voltageMv);
  return sorted.map((s) => [s.voltageMv, s.remainingMwh] as [number, number]);
}

/** 从电压→剩余容量曲线线性插值（无学习曲线时 fallback SOC_TABLE） */
function getEvidenceScore(device: DeviceLearnData): number {
  const allDischarge = [
    ...device.completedCycles.flatMap((c) => c.discharge),
    ...device.currentDischarge,
  ];
  const allCharge = [
    ...device.completedCycles.flatMap((c) => c.charge),
    ...device.currentCharge,
  ];
  const sampleCount = allDischarge.length + allCharge.length;
  const dischargeEvidence = allDischarge.length >= MIN_DISCHARGE_EVIDENCE ? 1 : 0;
  const cycleEvidence = Math.min(device.cycleCount, 3) / 3;
  const sampleEvidence = Math.min(sampleCount, 20) / 20;
  return (dischargeEvidence * 0.45 + cycleEvidence * 0.3 + sampleEvidence * 0.25);
}

function interpolateRemaining(
  curve: [number, number][] | null,
  voltageMv: number,
  capacityMwh: number,
): number {
  if (curve && curve.length >= 2) {
    for (let i = 0; i < curve.length - 1; i++) {
      const [vHigh, rHigh] = curve[i]!;
      const [vLow, rLow] = curve[i + 1]!;
      if (voltageMv <= vHigh && voltageMv >= vLow) {
        const t = (voltageMv - vLow) / (vHigh - vLow);
        return Math.round(rLow + (rHigh - rLow) * t);
      }
    }
    if (voltageMv > curve[0]![0]) return curve[0]![1];
    return curve[curve.length - 1]![1];
  }
  const table = SOC_TABLE;
  for (let i = 0; i < table.length - 1; i++) {
    const [vHigh, sHigh] = table[i]!;
    const [vLow, sLow] = table[i + 1]!;
    if (voltageMv <= vHigh && voltageMv >= vLow) {
      const t = (voltageMv - vLow) / (vHigh - vLow);
      const soc = sLow + (sHigh - sLow) * t;
      return Math.round(capacityMwh * soc / 100);
    }
  }
  if (voltageMv > table[0]![0]) return Math.round(capacityMwh * table[0]![1] / 100);
  return Math.round(capacityMwh * table[table.length - 1]![1] / 100);
}
