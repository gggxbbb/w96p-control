import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
          // 容量变了就重置
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

        // 判断是否在充放电中
        const hasCurrent = Math.abs(currentMa) > 10; // >10mA 才算有电流
        if (!hasCurrent) return;

        const prevTick = device.lastTickTs;
        const dtSec = prevTick > 0 ? (now - prevTick) / 1000 : 0;
        // 首次 tick 只记录时间不做积分
        if (dtSec <= 0 || dtSec > 60) {
          set((s) => ({
            devices: { ...s.devices, [serial]: { ...s.devices[serial]!, lastTickTs: now } },
          }));
          return;
        }

        const absCurrentMa = Math.abs(currentMa);
        // 放电能量 mWh = mV × mA × sec / 3600
        const deltaMwh = (voltageMv * absCurrentMa * dtSec) / 3_600_000;

        let tracked = device.trackedRemainingMwh;
        let calibrated = device.calibrated;
        let state = 'tracking' as const;

        // ── 满充检测 ──
        if (isCharging && voltageMv >= 4100 && absCurrentMa < 500 && device.currentCharge.length > 0 && device.currentDischarge.length > 0) {
          // 电压 ≥ 4.10V 且电流已降到 <500mA → 满充锚点
          tracked = capacityMwh;
          calibrated = true;
          // 保存当前充放采样为一次完整循环
          // 保存当前充放采样为一次完整循环
          // 自动校准充电效率
          let newEff = device.chargeEfficiency;
          if (device.chargeRawAccumMwh > 0) {
            const gained = capacityMwh - device.chargeStartRemainingMwh;
            if (gained > 0) {
              const rawEff = gained / device.chargeRawAccumMwh;
              // 指数平滑：新效率=旧效率×0.7 + 新计算×0.3
              newEff = Math.round((device.chargeEfficiency * 0.7 + rawEff * 0.3) * 1000) / 1000;
              newEff = Math.min(1.0, Math.max(0.5, newEff));
            }
          }
          const completed: CycleSamples = {
            charge: [...device.currentCharge],
            discharge: [...device.currentDischarge],
          };
          const cleaned = [...device.completedCycles, completed]
            .filter((c) => c.charge.length > 0 || c.discharge.length > 0);
          set((s) => ({
            devices: {
              ...s.devices,
              [serial]: {
                ...s.devices[serial]!,
                trackedRemainingMwh: tracked,
                calibrated: true,
                cycleCount: device.cycleCount + 1,
                chargeEfficiency: newEff,
                chargeStartRemainingMwh: capacityMwh,
                chargeRawAccumMwh: 0,
                currentCharge: [],
                currentDischarge: [],
                completedCycles: cleaned,
                lastTickTs: now,
                state,
              },
            },
          }));
          return;
        }

        // ── 积分 ──
        if (isCharging) {
          // 新充电段开始：记录起点
          let chargeStart = device.chargeStartRemainingMwh;
          let chargeRaw = device.chargeRawAccumMwh;
          if (chargeRaw === 0) {
            chargeStart = tracked;
          }
          chargeRaw += deltaMwh;

          // 充电：效率打折
          tracked += deltaMwh * device.chargeEfficiency;
          tracked = Math.min(tracked, capacityMwh);
          // 记录充电采样
          const sample: LearnSample = { voltageMv, remainingMwh: Math.round(tracked), ts: now };
          const newCharge = clampSamples([...device.currentCharge, sample]);

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
                lastTickTs: now,
                lastDeltaMwh: deltaMwh,  // 充电为正
                state,
              },
            },
          }));
        } else {
          // 放电：直接减
          tracked -= deltaMwh;
          tracked = Math.max(tracked, 0);
          const sample: LearnSample = { voltageMv, remainingMwh: Math.round(tracked), ts: now };
          const newDischarge = clampSamples([...device.currentDischarge, sample]);

          // ── 弱校准：如果还没满充校准过，用电压估算做弱修正 ──
          if (!calibrated) {
            const voltEstimate = (capacityMwh * socEstimate) / 100;
            // 弱校准：每次往电压估算方向拉 10%
            tracked = tracked + (voltEstimate - tracked) * 0.10;
          }

          set((s) => ({
            devices: {
              ...s.devices,
              [serial]: {
                ...s.devices[serial]!,
                trackedRemainingMwh: Math.round(tracked),
                calibrated,
                currentDischarge: newDischarge,
                lastTickTs: now,
                lastDeltaMwh: -deltaMwh,  // 放电为负
                state,
              },
            },
          }));
        }
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
          // 合并：保留更多循环次数的数据 + 合并采样
          const merged: DeviceLearnData = {
            ...existing,
            // 取更准的（已校准优先）
            calibrated: existing.calibrated || imported.calibrated,
            // 取更大循环次数
            cycleCount: Math.max(existing.cycleCount, imported.cycleCount),
            // 合并已完成循环（去重：按首个采样点时间戳判断）
            completedCycles: _mergeCycles(existing.completedCycles, imported.completedCycles),
            // 保留当前采样
            currentCharge: existing.currentCharge.length > 0 ? existing.currentCharge : imported.currentCharge,
            currentDischarge: existing.currentDischarge.length > 0 ? existing.currentDischarge : imported.currentDischarge,
            // 充电效率取平均
            chargeEfficiency: (existing.chargeEfficiency + imported.chargeEfficiency) / 2,
            // 容量以现有为准
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

        // 1. 校准基础分
        const base = device.calibrated ? 50 : 10;

        // 2. 循环加分：每轮 +10，最多 3 轮
        const cycleBonus = Math.min(device.cycleCount, 3) * 10;

        // 3. 电压覆盖度
        const allVoltages = [...allDischarge, ...allCharge].map((s) => s.voltageMv);
        const vMin = allVoltages.length > 0 ? Math.min(...allVoltages) : 0;
        const vMax = allVoltages.length > 0 ? Math.max(...allVoltages) : 0;
        const coverage = allVoltages.length > 0
          ? Math.min(1, (vMax - vMin) / 1200)  // 3.0~4.2V = 1200mV
          : 0;

        // 4. 采样密度加分
        const densityBonus = Math.min(10, Math.round(allDischarge.length / 10));

        // 5. 新鲜度
        const latestCycle = device.completedCycles[device.completedCycles.length - 1];
        const latestTs = latestCycle
          ? Math.max(
              ...(latestCycle.charge.length > 0 ? [latestCycle.charge[latestCycle.charge.length - 1]!.ts] : []),
              ...(latestCycle.discharge.length > 0 ? [latestCycle.discharge[latestCycle.discharge.length - 1]!.ts] : []),
            )
          : 0;
        const daysSince = latestTs > 0 ? (Date.now() - latestTs) / 86400000 : 999;
        const freshness = daysSince > 30 ? 0.5 : 1.0;

        // 综合
        const raw = (base + cycleBonus + densityBonus) * coverage * freshness;
        return Math.min(100, Math.round(raw));
      },
    }),
    { name: 'w96p-battery-learn',
      merge: (persisted: unknown, current: BatteryLearnState) => {
        const parsed = persisted as { devices?: Record<string, DeviceLearnData> } | undefined;
        if (!parsed?.devices) return current;
        // 清理空循环
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
function clampSamples(samples: LearnSample[], maxSamples = 500): LearnSample[] {
  if (samples.length <= maxSamples) return samples;
  const step = Math.ceil(samples.length / maxSamples);
  return samples.filter((_, i) => i % step === 0);
}

/** 校验导入数据的格式 */
function _validateImport(data: unknown) {
  if (!data || typeof data !== 'object') throw new Error('数据格式错误');
  // 宽松校验，只确保关键字段存在类型
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
