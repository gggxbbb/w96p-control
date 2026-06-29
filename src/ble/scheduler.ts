/**
 * GATT 三队列调度器
 *
 * 优先级：用户写 > 用户读 > 轮询读
 *
 * 所有 GATT 操作串行化，避免 "GATT operation already in progress"。
 * 轮询读队列非空时不进入下一个轮询周期（由调用方通过 pendingPollReads 判断）。
 */

type GattTask<T = unknown> = () => Promise<T>;

export class GattScheduler {
  private writeQueue: GattTask[] = [];
  private readQueue: GattTask[] = [];
  private pollQueue: GattTask[] = [];
  private running = false;
  private readonly label: string;

  constructor(label = 'GATT') {
    this.label = label;
  }

  /** 当前待处理的轮询读任务数（外部用于判断是否可进入下一轮询周期） */
  get pendingPollReads(): number {
    return this.pollQueue.length;
  }

  // ── 提交接口 ──

  /** 提交用户写任务（最高优先） */
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

  /** 提交用户读任务（中优先） */
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

  /** 提交轮询读任务（最低优先） */
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

  /** 停止调度器，清空所有队列 */
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
      let source = '写';
      let task = this.writeQueue.shift();
      if (!task) {
        source = '读';
        task = this.readQueue.shift();
      }
      if (!task) {
        source = '轮询';
        task = this.pollQueue.shift();
      }
      if (!task) break;

      console.log(`[调度器] 执行 ${source} | 剩余 ${this.stateSummary()}`);
      await task();
    }
    this.running = false;
    console.log(`[调度器] 空闲`);
  }
}
