/**
 * GATT 三队列调度器
 *
 * 优先级：用户写 > 用户读 > 轮询读
 *
 * 所有 GATT 操作串行化，避免 "GATT operation already in progress" 错误。
 * 轮询读队列非空时不进入下一个轮询周期（由调用方通过 {@link pendingPollReads} 判断）。
 */

type GattTask<T = unknown> = () => Promise<T>;

import { useBleMetrics } from '../stores/bleMetrics';

/** 调度器统计快照 */
export interface SchedulerStats {
  /** 写队列待处理数 */
  write: number;
  /** 读队列待处理数 */
  read: number;
  /** 轮询队列待处理数 */
  poll: number;
  /** 是否正在执行 */
  active: boolean;
  /** 当前执行的任务类型 */
  current: 'idle' | 'write' | 'read' | 'poll';
}

export class GattScheduler {
  private writeQueue: GattTask[] = [];
  private readQueue: GattTask[] = [];
  private pollQueue: GattTask[] = [];
  private running = false;
  private currentTask: SchedulerStats['current'] = 'idle';

  constructor(_label = 'GATT') {
    // label reserved for future use (multi-instance logging)
  }

  /** 当前待处理的轮询读任务数（外部用于判断是否可进入下一轮询周期） */
  get pendingPollReads(): number {
    return this.pollQueue.length;
  }

  /** 获取当前调度器状态快照 */
  getStats(): SchedulerStats {
    return {
      write: this.writeQueue.length,
      read: this.readQueue.length,
      poll: this.pollQueue.length,
      active: this.running,
      current: this.running ? this.currentTask : 'idle',
    };
  }

  // ── 提交接口 ──

  /** 提交用户写任务（最高优先级） */
  enqueueWrite<T>(task: GattTask<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.writeQueue.push(async () => {
        try { resolve(await task()); }
        catch (e) { reject(e); }
      });
      console.log(`[调度器] +写 | ${this.stateSummary()}`);
      this.kick();
    });
  }

  /** 提交用户读任务（中等优先级） */
  enqueueRead<T>(task: GattTask<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.readQueue.push(async () => {
        try { resolve(await task()); }
        catch (e) { reject(e); }
      });
      console.log(`[调度器] +读 | ${this.stateSummary()}`);
      this.kick();
    });
  }

  /** 提交轮询读任务（最低优先级） */
  enqueuePoll<T>(task: GattTask<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.pollQueue.push(async () => {
        try { resolve(await task()); }
        catch (e) { reject(e); }
      });
      console.log(`[调度器] +轮询 | ${this.stateSummary()}`);
      this.kick();
    });
  }

  /** 停止调度器并清空所有队列 */
  destroy(): void {
    const w = this.writeQueue.length;
    const r = this.readQueue.length;
    const p = this.pollQueue.length;
    if (w + r + p > 0) {
      console.log(`[调度器] 销毁, 丢弃: 写×${w} 读×${r} 轮询×${p}`);
    }
    this.writeQueue.length = 0;
    this.readQueue.length = 0;
    this.pollQueue.length = 0;
    this.running = false;
  }

  // ── 内部 ──

  private stateSummary(): string {
    return `写×${this.writeQueue.length} 读×${this.readQueue.length} 轮询×${this.pollQueue.length}`;
  }

  private kick(): void {
    if (this.running) return;
    this.running = true;
    void this.loop();
  }

  private async loop(): Promise<void> {
    while (true) {
      let source: SchedulerStats['current'] = 'idle';
      let task = this.writeQueue.shift();
      if (task) {
        source = 'write';
      } else {
        task = this.readQueue.shift();
        if (task) {
          source = 'read';
        } else {
          task = this.pollQueue.shift();
          if (task) source = 'poll';
        }
      }
      if (!task) break;

      this.currentTask = source;
      useBleMetrics.getState().setSchedulerState(source);
      const label = source === 'write' ? '写' : source === 'read' ? '读' : '轮询';
      console.log(`[调度器] 执行 ${label} | 剩余 ${this.stateSummary()}`);
      await task();
    }
    this.currentTask = 'idle';
    this.running = false;
    useBleMetrics.getState().setSchedulerState('idle');
    console.log(`[调度器] 空闲`);
  }
}
