/**
 * GATT 写入队列
 *
 * 所有用户写操作通过此队列串行化，由 {@link GattScheduler} 调度执行。
 * 处理自然风/风扇写入冲突（写入转速前自动关闭自然风）。
 */

import type { PowReg } from './commands.js';
import { cmd, encodeCmd } from './commands.js';
import type { GattCharacteristic } from './transport.js';
import type { GattScheduler } from './scheduler.js';
import type { BleMetricsCollector } from './metrics.js';

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

export class WriteQueue {
  private scheduler: GattScheduler | null = null;
  private natureWindOn = false;
  private _natureChar: GattCharacteristic | null = null;
  private regChar: GattCharacteristic | null = null;
  private metrics: BleMetricsCollector | null = null;

  /** 绑定调度器，此后所有写入通过调度器的高优写队列执行 */
  bindScheduler(s: GattScheduler, metrics?: BleMetricsCollector): void {
    this.scheduler = s;
    if (metrics) this.metrics = metrics;
  }

  get natureChar(): GattCharacteristic | null {
    return this._natureChar;
  }

  isNatureWindOn(): boolean {
    return this.natureWindOn;
  }

  setNatureWindChar(c: GattCharacteristic) {
    this._natureChar = c;
  }

  setRegChar(c: GattCharacteristic) {
    this.regChar = c;
  }

  setNatureWindOn(on: boolean) {
    this.natureWindOn = on;
  }

  /** 将写任务提交到调度器的高优写队列 */
  enqueue<T>(task: () => Promise<T>): Promise<T> {
    if (!this.scheduler) throw new Error('WriteQueue: scheduler 未绑定');
    return new Promise<T>((resolve, reject) => {
      this.scheduler!.enqueueWrite(async () => {
        try {
          resolve(await task());
        } catch (e) {
          reject(e);
        }
      });
    });
  }

  /**
   * 直接 GATT 写入（含重试），不经过调度器
   * @param char - 目标 GATT 特征
   * @param data - 写入数据
   * @param retries - 最大重试次数
   */
  async rawWrite(
    char: GattCharacteristic,
    data: Uint8Array,
    retries = 3,
  ): Promise<void> {
    const hex = Array.from(data).map(b => b.toString(16).padStart(2, '0')).join(' ');
    const charId = char.uuid.slice(4, 8);
    const t0 = performance.now();
    for (let i = 0; i < retries; i++) {
      try {
        console.log('[BLE] 写入 ' + charId + ' (' + data.length + 'B): ' + hex);
        if (char.properties.writeWithoutResponse) {
          await char.writeValueWithoutResponse(data);
        } else {
          await char.writeValue(data);
        }
        this.metrics?.recordOp({
          ts: t0, type: 'write', charId, size: data.length,
          duration: Math.round(performance.now() - t0),
        });
        return;
      } catch (e) {
        if (i === retries - 1) {
          console.log('[BLE] rawWrite 最终失败（已重试' + retries + '次）:', e);
          this.metrics?.recordOp({
            ts: t0, type: 'write', charId, size: data.length,
            duration: Math.round(performance.now() - t0),
            error: String(e instanceof Error ? e.message : e),
          });
          throw e;
        }
        await sleep(200);
      }
    }
  }

  /**
   * 写入风扇转速，自动处理自然风冲突
   * @param char - FFF3 特征
   * @param pct - 转速百分比 0-100
   */
  async writeFanSpeed(
    char: GattCharacteristic,
    pct: number,
  ): Promise<void> {
    await this.enqueue(async () => {
      if (this.natureWindOn && this._natureChar) {
        await this.rawWrite(this._natureChar, new Uint8Array([0]));
        await sleep(100);
        this.natureWindOn = false;
      }
      await this.rawWrite(char, new Uint8Array([pct]));
    });
  }

  /**
   * 写入电源寄存器位
   * @param reg - 寄存器编号
   * @param bit - 位偏移
   * @param value - 目标值
   */
  async writeRegisterBit(
    reg: PowReg,
    bit: number,
    value: boolean,
  ): Promise<void> {
    if (!this.regChar) throw new Error('regChar 未设置');
    await this.enqueue(async () => {
      const curBuf = await this.regChar!.readValue();
      const cur = new DataView(curBuf.buffer).getUint8(0);
      const mask = 1 << bit;
      const next = value ? (cur | mask) : (cur & ~mask);
      await this.rawWrite(this.regChar!, encodeCmd(cmd.setRegister(reg, next)));
    });
  }
}
