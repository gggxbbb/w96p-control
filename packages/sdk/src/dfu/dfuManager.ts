/**
 * DFU 连接管理器
 *
 * 通过 FEE0 服务扫描、连接、重连 WITRN 设备，
 * 发送包协议帧并等待响应。
 *
 * @deprecated DFU 模块将于未来版本移除，请勿在新代码中依赖。
 */

/// <reference types="web-bluetooth" />

import { DFU_SERVICE, DFU_WRITE, DFU_NOTIFY } from '../ble/uuids.js';
import { BlePackageProtocol } from './packageProtocol.js';

/** DFU 日志回调 */
export type DfuLogFn = (msg: string, level?: 'info' | 'warn' | 'error' | 'success') => void;

/** BLE MTU=200 时单帧最大分片字节数 */
const BLE_MAX_CHUNK = 197; // MTU 200 - 3

/**
 * DFU 升级管理器
 *
 * 封装 FEE0 服务的 BLE 连接、包协议帧收发和响应等待。
 *
 * @deprecated DFU 模块将于未来版本移除
 */
export class DfuManager {
  private gatt: BluetoothRemoteGATTServer | null = null;
  private device: BluetoothDevice | null = null;
  private writeChar: BluetoothRemoteGATTCharacteristic | null = null;
  private notifyChar: BluetoothRemoteGATTCharacteristic | null = null;
  private protocol = new BlePackageProtocol(true);
  private log: DfuLogFn;
  private pendingResolve: ((data: Uint8Array) => void) | null = null;
  private notifyCleanup: (() => void) | null = null;

  /** @param logFn - 日志回调 */
  constructor(logFn: DfuLogFn) {
    this.log = logFn;
  }

  /** 设备是否连接 */
  get isConnected(): boolean {
    return this.gatt?.connected ?? false;
  }

  /**
   * 扫描并连接 WITRN 设备（FEE0 服务）
   * @deprecated
   */
  async connect(): Promise<void> {
    this.log('正在扫描 WITRN 设备...', 'info');

    const device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [DFU_SERVICE] }],
      optionalServices: [DFU_SERVICE],
    });

    this.device = device;

    this.log(`找到设备: ${device.name ?? 'unknown'} (${device.id})`, 'info');

    device.addEventListener('gattserverdisconnected', () => {
      this.log('设备已断开连接', 'warn');
      if (this.pendingResolve) {
        this.pendingResolve = null;
      }
    });

    this.log('正在连接 GATT...', 'info');
    this.gatt = await device.gatt!.connect();

    await this.setupService();
  }

  /**
   * 重连已配对的设备（不需要用户手势，用于 DFU 重启后）
   * @deprecated
   */
  async reconnect(): Promise<void> {
    if (!this.device) throw new Error('无已配对设备，请先调用 connect()');

    this.log('正在重新连接设备...', 'info');
    this.gatt = await this.device.gatt!.connect();

    this.log('重新连接成功', 'success');
    await this.setupService();
  }

  private async setupService(): Promise<void> {
    this.log('正在获取 FEE0 服务...', 'info');
    const service = await this.gatt!.getPrimaryService(DFU_SERVICE);

    this.writeChar = await service.getCharacteristic(DFU_WRITE);
    this.notifyChar = await service.getCharacteristic(DFU_NOTIFY);

    this.log('FEE0 服务就绪', 'success');
  }

  /**
   * 发送包协议帧并等待响应（单次请求-响应模式）
   * @param payload - 协议载荷
   * @param timeoutMs - 超时毫秒数
   * @deprecated
   */
  async request(payload: Uint8Array, timeoutMs = 3000): Promise<Uint8Array> {
    if (!this.writeChar) throw new Error('not connected');

    const frame = this.protocol.pack(payload);

    return new Promise<Uint8Array>((resolve, reject) => {
      this.pendingResolve = resolve;

      const timeout = setTimeout(() => {
        this.pendingResolve = null;
        const err = new Error(`request timeout after ${timeoutMs}ms`);
        console.log('[DFU] 请求超时:', err.message);
        reject(err);
      }, timeoutMs);

      if (!this.notifyCleanup) {
        this.notifyChar!
          .startNotifications()
          .then(() => {
            this.notifyChar!.addEventListener('characteristicvaluechanged', this.onNotify);
            this.notifyCleanup = () => {
              this.notifyChar?.removeEventListener('characteristicvaluechanged', this.onNotify);
            };
            this.log('通知通道已开启', 'info');
            this.sendFrame(frame).catch((err) => {
              console.log('[DFU] sendFrame 失败:', err);
              clearTimeout(timeout);
              reject(err);
            });
          })
          .catch((err) => {
            console.log('[DFU] startNotifications 失败:', err);
            clearTimeout(timeout);
            reject(err);
          });
      } else {
        this.sendFrame(frame).catch((err) => {
          console.log('[DFU] sendFrame 失败:', err);
          clearTimeout(timeout);
          reject(err);
        });
      }
    });
  }

  /**
   * 断开 DFU 连接并清理资源
   * @deprecated
   */
  async disconnect(): Promise<void> {
    if (this.notifyChar && this.notifyCleanup) {
      this.notifyCleanup();
    }
    if (this.gatt?.connected) {
      await this.gatt.disconnect();
    }
    this.gatt = null;
    this.device = null;
    this.writeChar = null;
    this.notifyChar = null;
    this.notifyCleanup = null;
    this.protocol.reset();
    this.log('DFU 连接已关闭', 'info');
  }

  // ── private ──

  private onNotify = (event: Event) => {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    const value = target.value;
    if (!value) return;

    const data = new Uint8Array(value.buffer, 0, value.byteLength);
    const payloads = this.protocol.onReceive(data);

    for (const payload of payloads) {
      if (this.pendingResolve) {
        const resolve = this.pendingResolve;
        this.pendingResolve = null;
        resolve(payload);
      }
    }
  };

  private async sendFrame(frame: Uint8Array): Promise<void> {
    for (let offset = 0; offset < frame.length; offset += BLE_MAX_CHUNK) {
      const chunk = frame.slice(offset, offset + BLE_MAX_CHUNK);
      await this.writeChar!.writeValueWithoutResponse(chunk as BufferSource);
    }
  }
}
