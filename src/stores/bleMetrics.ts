/**
 * BLE 性能指标 Store
 *
 * 记录 GATT 操作的延迟分布、调度器状态快照和累计统计。
 * 最近 200 条操作记录 + 最近 100 个调度器快照（环形缓冲）。
 */

import { create } from 'zustand';
import type { OpRecord, SchedulerSnapshot } from '@gggxbbb/w96p-ble-sdk';

interface BleMetricsState {
  /** 最近 200 条操作记录（环形） */
  ops: OpRecord[];
  /** 最近 100 个调度器快照 */
  snapshots: SchedulerSnapshot[];
  /** 累计统计 */
  total: { writes: number; reads: number; polls: number; errors: number };
  /** 操作耗时分布（ms 桶） */
  latencyBuckets: number[];
  /** 调度器当前状态 */
  schedulerState: 'idle' | 'write' | 'read' | 'poll';

  recordOp: (op: OpRecord) => void;
  setSchedulerState: (s: 'idle' | 'write' | 'read' | 'poll') => void;
  recordSnapshot: (s: SchedulerSnapshot) => void;
  reset: () => void;
}

const MAX_OPS = 200;
const MAX_SNAPS = 100;
/** 延迟分布桶边界：<10, <20, <50, <100, <200, <500, <1000, >=1000 ms */
export const BUCKETS = [10, 20, 50, 100, 200, 500, 1000, Infinity];

/** BLE 性能指标 Zustand Store */
export const useBleMetrics = create<BleMetricsState>((set) => ({
  ops: [],
  snapshots: [],
  total: { writes: 0, reads: 0, polls: 0, errors: 0 },
  latencyBuckets: new Array(BUCKETS.length).fill(0),
  schedulerState: 'idle' as const,

  /** 记录一次 GATT 操作 */
  recordOp: (op) => set((s) => {
    const ops = [...s.ops, op].slice(-MAX_OPS);
    const total = { ...s.total };
    total[op.type === 'write' ? 'writes' : op.type === 'read' ? 'reads' : 'polls']++;
    if (op.error) total.errors++;

    const buckets = [...s.latencyBuckets];
    for (let i = 0; i < BUCKETS.length; i++) {
      if (op.duration < BUCKETS[i]!) { buckets[i]++; break; }
    }

    return { ops, total, latencyBuckets: buckets };
  }),

  /** 记录调度器状态快照 */
  recordSnapshot: (snp) => set((s) => ({
    snapshots: [...s.snapshots, snp].slice(-MAX_SNAPS),
  })),

  setSchedulerState: (state) => set({ schedulerState: state }),

  /** 重置所有指标 */
  reset: () => set({
    ops: [],
    snapshots: [],
    total: { writes: 0, reads: 0, polls: 0, errors: 0 },
    latencyBuckets: new Array(BUCKETS.length).fill(0),
    schedulerState: 'idle',
  }),
}));
