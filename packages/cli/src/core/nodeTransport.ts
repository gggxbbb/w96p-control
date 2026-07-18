/**
 * Node BLE 传输层
 *
 * 将 webbluetooth（SimpleBLE）的 device/server/service/characteristic
 * 包装为 SDK 的 GattTransport 接口族。设备选择策略通过构造函数注入，
 * transport 本身保持哑层；不触碰 navigator 全局。
 */

import { Bluetooth, getAdapters } from 'webbluetooth';
import { readdirSync } from 'node:fs';
import type {
  GattCharacteristic,
  GattCharacteristicProperties,
  GattCharacteristicValueChangedEvent,
  GattDevice,
  GattServer,
  GattService,
  GattTransport,
  RequestDeviceOptions,
} from '@gggxbbb/w96p-ble-sdk';

/** 确认本机有可用蓝牙适配器；无则抛友好错误，避免 native abort。 */
function assertBluetoothAvailable(): void {
  if (process.platform === 'linux') {
    let hasSysfsAdapter = false;
    try {
      hasSysfsAdapter = readdirSync('/sys/class/bluetooth').some((name) => name.startsWith('hci'));
    } catch {
      hasSysfsAdapter = false;
    }
    if (!hasSysfsAdapter) {
      throw new Error(
        '未检测到蓝牙适配器（/sys/class/bluetooth 下无 hci 设备）。请确认运行环境有可用的 BLE，或使用 --virtual 运行虚拟模式。',
      );
    }
  }

  let adapters: unknown[] = [];
  try {
    adapters = getAdapters();
  } catch (e) {
    throw new Error(`无法枚举蓝牙适配器: ${e instanceof Error ? e.message : String(e)}`);
  }

  if (adapters.length === 0) {
    throw new Error(
      '未检测到蓝牙适配器。请确认运行环境有可用的 BLE，或使用 --virtual 运行虚拟模式。',
    );
  }
}

export interface FoundDeviceInfo {
  id: string;
  name: string | null;
}

/**
 * 设备发现回调：返回 true 立即选中该设备；
 * 返回 false 可保存 select 稍后调用（交互选择，见 CLI-4）
 */
export type DeviceFoundCallback = (device: FoundDeviceInfo, select: () => void) => boolean;

class NodeCharacteristic implements GattCharacteristic {
  private readonly listenerMap = new Map<
    (event: GattCharacteristicValueChangedEvent) => void,
    (event: Event) => void
  >();

  private readonly native: BluetoothRemoteGATTCharacteristic;

  constructor(native: BluetoothRemoteGATTCharacteristic) {
    this.native = native;
  }

  get uuid(): string {
    return this.native.uuid;
  }

  get properties(): GattCharacteristicProperties {
    const native = this.native.properties;
    return {
      write: native.write,
      writeWithoutResponse: native.writeWithoutResponse,
      read: native.read,
      notify: native.notify,
    };
  }

  readValue(): Promise<DataView> {
    return this.native
      .readValue()
      .then((v) => new DataView(v.buffer, v.byteOffset, v.byteLength));
  }

  writeValue(value: Uint8Array): Promise<void> {
    return this.native.writeValue(value as BufferSource).then(() => undefined);
  }

  writeValueWithoutResponse(value: Uint8Array): Promise<void> {
    return this.native.writeValueWithoutResponse(value as BufferSource).then(() => undefined);
  }

  startNotifications(): Promise<void> {
    return this.native.startNotifications().then(() => undefined);
  }

  stopNotifications(): Promise<void> {
    return this.native.stopNotifications().then(() => undefined);
  }

  addEventListener(
    type: 'characteristicvaluechanged',
    listener: (event: GattCharacteristicValueChangedEvent) => void,
  ): void {
    const handler = (event: Event) => {
      const target = event.target as BluetoothRemoteGATTCharacteristic;
      const value = target.value;
      if (!value) return;
      listener({ value: new DataView(value.buffer, value.byteOffset, value.byteLength) });
    };
    this.listenerMap.set(listener, handler);
    this.native.addEventListener(type, handler);
  }

  removeEventListener(
    type: 'characteristicvaluechanged',
    listener: (event: GattCharacteristicValueChangedEvent) => void,
  ): void {
    const handler = this.listenerMap.get(listener);
    if (handler) {
      this.listenerMap.delete(listener);
      this.native.removeEventListener(type, handler);
    }
  }
}

class NodeService implements GattService {
  private readonly native: BluetoothRemoteGATTService;

  constructor(native: BluetoothRemoteGATTService) {
    this.native = native;
  }

  get uuid(): string {
    return this.native.uuid;
  }

  async getCharacteristic(uuid: string): Promise<GattCharacteristic> {
    const char = await this.native.getCharacteristic(uuid);
    return new NodeCharacteristic(char);
  }
}

class NodeServer implements GattServer {
  private readonly native: BluetoothRemoteGATTServer;

  constructor(native: BluetoothRemoteGATTServer) {
    this.native = native;
  }

  get connected(): boolean {
    return this.native.connected;
  }

  connect(): Promise<void> {
    return this.native.connect().then(() => undefined);
  }

  disconnect(): void {
    this.native.disconnect();
  }

  async getPrimaryService(uuid: string): Promise<GattService> {
    const svc = await this.native.getPrimaryService(uuid);
    return new NodeService(svc);
  }

  async getPrimaryServices(uuid?: string): Promise<GattService[]> {
    const svcs = await this.native.getPrimaryServices(uuid);
    return svcs.map((s) => new NodeService(s));
  }
}

class NodeDevice implements GattDevice {
  private readonly native: BluetoothDevice;

  constructor(native: BluetoothDevice) {
    this.native = native;
  }

  get name(): string | null {
    return this.native.name ?? null;
  }

  get gatt(): GattServer {
    if (!this.native.gatt) {
      throw new Error('NodeDevice: gatt is not available');
    }
    return new NodeServer(this.native.gatt);
  }

  addEventListener(type: 'gattserverdisconnected', listener: () => void): void {
    this.native.addEventListener(type, listener);
  }

  removeEventListener(type: 'gattserverdisconnected', listener: () => void): void {
    this.native.removeEventListener(type, listener);
  }
}

export class NodeTransport implements GattTransport {
  private readonly deviceFound?: DeviceFoundCallback;
  private readonly windowSec: number;
  private readonly totalTimeoutMs: number;

  constructor(deviceFound?: DeviceFoundCallback, windowSec = 3, totalTimeoutMs = 15_000) {
    this.deviceFound = deviceFound;
    this.windowSec = windowSec;
    this.totalTimeoutMs = totalTimeoutMs;
  }

  /**
   * 循环扫描直到选中设备或总超时。
   *
   * 背景：SimpleBLE/WinRT 下进程内首次 scanStart 的 watcher 全程哑（收不到任何
   * 广播，已用诊断脚本复现验证），必须 stopScan 后重新开始。因此每轮使用全新
   * Bluetooth 实例开独立窗口，'no devices found' 时在总时限内立即重试。
   *
   * 注意：若 deviceFound 回调对命中设备返回 false（交互选择场景，见 CLI-4），
   * 该窗口在超时后既 resolve 不了也 reject 不了（found=true 时 webbluetooth 不
   * reject）——本循环不适用交互选择，交互流程需单独处理。
   */
  async requestDevice(options: RequestDeviceOptions): Promise<GattDevice> {
    assertBluetoothAvailable();

    const deviceFoundCb = this.deviceFound;
    const buildOptions = (scanTimeSec: number) => ({
      scanTime: scanTimeSec,
      deviceFound: deviceFoundCb
        ? (device: BluetoothDevice, selectFn: () => void) =>
            deviceFoundCb({ id: device.id, name: device.name ?? null }, selectFn)
        : undefined,
    });

    // Windows 需要每轮用全新 Bluetooth 实例绕开 WinRT 首次扫描哑窗问题（CLI-3）。
    // Linux/macOS 则用单实例扫描，避免 SimpleBLE D-Bus cleanup 时重复卸载 match rule。
    if (process.platform === 'win32') {
      const deadline = Date.now() + this.totalTimeoutMs;
      let lastError: unknown = new Error('requestDevice error: no devices found');
      while (Date.now() < deadline) {
        const remainingSec = Math.min(this.windowSec, (deadline - Date.now()) / 1000);
        const bluetooth = new Bluetooth(buildOptions(remainingSec));
        try {
          const device = await bluetooth.requestDevice(options);
          return new NodeDevice(device);
        } catch (e) {
          lastError = e;
          if (String(e) !== 'requestDevice error: no devices found') throw e;
        }
      }
      throw lastError;
    }

    const totalSec = Math.min(this.totalTimeoutMs / 1000, 60);
    const bluetooth = new Bluetooth(buildOptions(totalSec));
    const device = await bluetooth.requestDevice(options);
    return new NodeDevice(device);
  }
}
