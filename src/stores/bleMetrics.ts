import { create } from 'zustand';

export interface OpRecord {
  ts: number;           // performance.now()
  type: 'write' | 'read' | 'poll';
  charId: string;       // 特征 UUID 短名 fff1/fff3/ffd1...
  size: number;         // 字节数（写）或 0（读）
  duration: number;     // 耗时 ms
  error?: string;
}

export interface SchedulerSnapshot {
  ts: number;
  write: number;
  read: number;
  poll: number;
  active: boolean;
}

interface BleMetricsState {
  /** 最近 200 条操作记录（环形） */
  ops: OpRecord[];
  /** 最近 100 个调度器快照 */
  snapshots: SchedulerSnapshot[];
  /** 累计统计 */
  total: { writes: number; reads: number; polls: number; errors: number };
  /** 操作耗时分布（ms 桶） */
  latencyBuckets: number[];  // [<10, <20, <50, <100, <200, <500, <1000, >=1000]
  /** 调度器当前状态 */
  schedulerState: 'idle' | 'write' | 'read' | 'poll';

  recordOp: (op: OpRecord) => void;
  setSchedulerState: (s: 'idle' | 'write' | 'read' | 'poll') => void;
  recordSnapshot: (s: SchedulerSnapshot) => void;
  reset: () => void;
}

const MAX_OPS = 200;
const MAX_SNAPS = 100;
const BUCKETS = [10, 20, 50, 100, 200, 500, 1000, Infinity];

export const useBleMetrics = create<BleMetricsState>((set) => ({
  ops: [],
  snapshots: [],
  total: { writes: 0, reads: 0, polls: 0, errors: 0 },
  latencyBuckets: new Array(BUCKETS.length).fill(0),
  schedulerState: 'idle' as const,

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

  recordSnapshot: (snp) => set((s) => ({
    snapshots: [...s.snapshots, snp].slice(-MAX_SNAPS),
  })),

  setSchedulerState: (state) => set({ schedulerState: state }),

  reset: () => set({
    ops: [],
    snapshots: [],
    total: { writes: 0, reads: 0, polls: 0, errors: 0 },
    latencyBuckets: new Array(BUCKETS.length).fill(0),
    schedulerState: 'idle',
  }),
}));

export { BUCKETS };
