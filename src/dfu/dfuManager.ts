import { DFU_SERVICE, DFU_WRITE, DFU_NOTIFY } from '../ble/uuids';
import { BlePackageProtocol } from './packageProtocol';

export type DfuLogFn = (msg: string, level?: 'info' | 'warn' | 'error' | 'success') => void;

const BLE_MAX_CHUNK = 197; // MTU 200 - 3

export class DfuManager {
  private gatt: BluetoothRemoteGATTServer | null = null;
  private writeChar: BluetoothRemoteGATTCharacteristic | null = null;
  private notifyChar: BluetoothRemoteGATTCharacteristic | null = null;
  private protocol = new BlePackageProtocol(true);
  private log: DfuLogFn;
  private pendingResolve: ((data: Uint8Array) => void) | null = null;
  private notifyCleanup: (() => void) | null = null;

  constructor(logFn: DfuLogFn) {
    this.log = logFn;
  }

  get isConnected(): boolean {
    return this.gatt?.connected ?? false;
  }

  /** 扫描并连接 WITRN 设备（FEE0 服务） */
  async connect(): Promise<void> {
    this.log('正在扫描 WITRN 设备...', 'info');

    const device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [DFU_SERVICE] }],   // 按 FEE0 服务 UUID 精确匹配
      optionalServices: [DFU_SERVICE],
    });

    this.log(`找到设备: ${device.name ?? 'unknown'} (${device.id})`, 'info');

    device.addEventListener('gattserverdisconnected', () => {
      this.log('设备已断开连接', 'warn');
      // Clean up pending request if any
      if (this.pendingResolve) {
        this.pendingResolve = null;
      }
    });

    this.log('正在连接 GATT...', 'info');
    this.gatt = await device.gatt!.connect();

    this.log('正在获取 FEE0 服务...', 'info');
    const service = await this.gatt.getPrimaryService(DFU_SERVICE);

    this.writeChar = await service.getCharacteristic(DFU_WRITE);
    this.notifyChar = await service.getCharacteristic(DFU_NOTIFY);

    this.log('FEE0 服务就绪', 'success');
  }

  /** 发送包协议帧并等待响应（单次请求-响应模式） */
  async request(payload: Uint8Array, timeoutMs = 3000): Promise<Uint8Array> {
    if (!this.writeChar) throw new Error('not connected');

    const frame = this.protocol.pack(payload);

    return new Promise<Uint8Array>((resolve, reject) => {
      this.pendingResolve = resolve;

      const timeout = setTimeout(() => {
        this.pendingResolve = null;
        reject(new Error(`request timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      // Ensure notify is started
      if (!this.notifyCleanup) {
        this.notifyChar!
          .startNotifications()
          .then(() => {
            this.notifyChar!.addEventListener('characteristicvaluechanged', this.onNotify);
            this.log('通知通道已开启', 'info');
            this.sendFrame(frame).catch((err) => {
              clearTimeout(timeout);
              reject(err);
            });
          })
          .catch((err) => {
            clearTimeout(timeout);
            reject(err);
          });
      } else {
        this.sendFrame(frame).catch((err) => {
          clearTimeout(timeout);
          reject(err);
        });
      }
    });
  }

  /** 断开连接 */
  async disconnect(): Promise<void> {
    if (this.notifyChar && this.notifyCleanup) {
      this.notifyChar.removeEventListener('characteristicvaluechanged', this.onNotify);
    }
    if (this.gatt?.connected) {
      await this.gatt.disconnect();
    }
    this.gatt = null;
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

    const data = new Uint8Array(value.buffer);
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
      await this.writeChar!.writeValueWithoutResponse(chunk);
    }
  }
}
