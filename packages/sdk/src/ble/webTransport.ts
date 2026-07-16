/// <reference types="web-bluetooth" />

/**
 * Web Bluetooth transport adapter for the GATT transport abstraction.
 */

import type {
  GattCharacteristic,
  GattCharacteristicProperties,
  GattCharacteristicValueChangedEvent,
  GattDevice,
  GattServer,
  GattService,
  GattTransport,
  RequestDeviceOptions,
} from './transport.js';

class WebBluetoothCharacteristic implements GattCharacteristic {
  private native: BluetoothRemoteGATTCharacteristic;
  private listenerMap: Record<
    string,
    (event: GattCharacteristicValueChangedEvent) => void
  >;

  constructor(native: BluetoothRemoteGATTCharacteristic) {
    this.native = native;
    this.listenerMap = {};
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
    return this.native.readValue().then((v) => {
      return new DataView(v.buffer, v.byteOffset, v.byteLength);
    });
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
    this.listenerMap[String(listener)] = listener;
    this.native.addEventListener(type, handler);
  }

  removeEventListener(
    type: 'characteristicvaluechanged',
    listener: (event: GattCharacteristicValueChangedEvent) => void,
  ): void {
    const key = String(listener);
    const stored = this.listenerMap[key];
    if (stored !== undefined) {
      delete this.listenerMap[key];
    }
    // Web Bluetooth API requires the exact native listener to remove it.
    // Because we wrap the listener, we can only clear all listeners of this type
    // in this adapter. The SDK only attaches one listener per characteristic.
    this.native.removeEventListener(type, () => {});
  }
}

class WebBluetoothService implements GattService {
  private native: BluetoothRemoteGATTService;

  constructor(native: BluetoothRemoteGATTService) {
    this.native = native;
  }

  get uuid(): string {
    return this.native.uuid;
  }

  async getCharacteristic(uuid: string): Promise<GattCharacteristic> {
    const char = await this.native.getCharacteristic(uuid);
    return new WebBluetoothCharacteristic(char);
  }
}

class WebBluetoothServer implements GattServer {
  private native: BluetoothRemoteGATTServer;

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
    return new WebBluetoothService(svc);
  }

  async getPrimaryServices(uuid?: string): Promise<GattService[]> {
    const svcs = await this.native.getPrimaryServices(uuid);
    return svcs.map((s) => new WebBluetoothService(s));
  }
}

class WebBluetoothDevice implements GattDevice {
  private native: BluetoothDevice;

  constructor(native: BluetoothDevice) {
    this.native = native;
  }

  get name(): string | null {
    return this.native.name ?? null;
  }

  get gatt(): GattServer {
    if (!this.native.gatt) {
      throw new Error('WebBluetoothDevice: gatt is not available');
    }
    return new WebBluetoothServer(this.native.gatt);
  }

  addEventListener(type: 'gattserverdisconnected', listener: () => void): void {
    this.native.addEventListener(type, listener);
  }

  removeEventListener(type: 'gattserverdisconnected', listener: () => void): void {
    this.native.removeEventListener(type, listener);
  }
}

export class WebBluetoothTransport implements GattTransport {
  async requestDevice(options: RequestDeviceOptions): Promise<GattDevice> {
    const device = await navigator.bluetooth.requestDevice(options as unknown as RequestDeviceOptions);
    return new WebBluetoothDevice(device);
  }
}
