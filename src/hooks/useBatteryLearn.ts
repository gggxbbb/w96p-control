import { useMemo } from 'react';
import { useBatteryLearnStore, getRemaining } from '../stores/batteryLearn';
import { useDeviceStore } from '../stores/device';

interface BatteryLearnSnapshot {
  /** 学习到的当前电量百分比 (0-100)，由电压-能量曲线计算 */
  socPct: number | null;
  /** 学习到的当前剩余容量 (mWh)，无数据时为 null */
  remainingMwh: number | null;
  /** 学习到的总容量 (mWh) */
  learnedCapacityMwh: number | null;
  /** 电池健康度 SOH (%) = 学习容量 / 标称容量 × 100 */
  healthPct: number | null;
  /** 标称容量 (mWh) */
  configuredCapacityMwh: number | null;
  /** 电压覆盖率 (0-100) */
  coverage: number;
  /** 可信度 (0-100) */
  credibility: number;
  /** 满充次数 */
  cycleCount: number;
  /** 是否有有效学习数据 */
  hasData: boolean;
}

/**
 * 电量学习便捷 Hook：自动绑定当前设备，所有值均从电池学习数据计算。
 *
 * 用法：
 *   const { socPct, remainingMwh, learnedCapacityMwh, healthPct } = useBatteryLearn();
 */
export function useBatteryLearn(): BatteryLearnSnapshot {
  const serialNumber = useDeviceStore((s) => s.serialNumber);
  const voltageMv = useDeviceStore((s) => s.battery?.voltageMv ?? null);

  const devices = useBatteryLearnStore((s) => s.devices);
  const credFn = useBatteryLearnStore((s) => s.getCredibility);

  return useMemo(() => {
    const empty = {
      socPct: null,
      remainingMwh: null,
      learnedCapacityMwh: null,
      healthPct: null,
      configuredCapacityMwh: null,
      coverage: 0,
      credibility: 0,
      cycleCount: 0,
      hasData: false,
    };

    if (!serialNumber) return empty;

    const data = devices[serialNumber];
    if (!data) return empty;

    const ts = data.dischargeTransitions ?? [];
    const cap = data.configuredCapacityMwh;
    let remainingMwh: number | null = null;
    let socPct: number | null = null;

    if (ts.length > 0 && voltageMv != null) {
      const raw = getRemaining(ts, cap, data.calibrated, data.learnedCapacityMwh, voltageMv);
      remainingMwh = raw;
      socPct = Math.round(raw / cap * 100);
    }

    const allMv = ts.flatMap((t) => [t.fromMv, t.toMv]);
    const coverage = allMv.length > 0
      ? Math.round((Math.max(...allMv) - Math.min(...allMv)) / 12)
      : 0;

    const learned = data.learnedCapacityMwh;
    const healthPct = (learned != null && cap > 0)
      ? Math.round(learned / cap * 100)
      : null;

    return {
      socPct,
      remainingMwh,
      learnedCapacityMwh: learned,
      healthPct,
      configuredCapacityMwh: cap,
      coverage,
      credibility: credFn(serialNumber),
      cycleCount: data.cycleCount,
      hasData: ts.length > 0,
    };
  }, [serialNumber, devices, voltageMv, credFn]);
}
