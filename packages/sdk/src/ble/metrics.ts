/**
 * Optional BLE metrics collector.
 *
 * The SDK does not depend on any state management library. Consumers (web app,
 * CLI, etc.) can inject a collector to record GATT operations and scheduler
 * state.
 */

import type { SchedulerStats } from './scheduler.js';

/** Single GATT operation record. */
export interface OpRecord {
  /** 发起时间 (performance.now()) */
  ts: number;
  /** 操作类型 */
  type: 'write' | 'read' | 'poll';
  /** 特征 UUID 短名 (fff1/fff3/ffd1...) */
  charId: string;
  /** 字节数 */
  size: number;
  /** 耗时 (ms) */
  duration: number;
  /** 错误信息（成功时无） */
  error?: string;
}

/** Scheduler state snapshot. */
export interface SchedulerSnapshot extends SchedulerStats {
  ts: number;
}

export interface BleMetricsCollector {
  recordOp(op: OpRecord): void;
  recordSnapshot(snapshot: SchedulerSnapshot): void;
  setSchedulerState(state: 'idle' | 'write' | 'read' | 'poll'): void;
}

export class NoOpMetricsCollector implements BleMetricsCollector {
  recordOp(): void {}
  recordSnapshot(): void {}
  setSchedulerState(): void {}
}
