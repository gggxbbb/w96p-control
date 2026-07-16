/**
 * GATT transport abstraction
 *
 * Decouples `BleManager` and `WriteQueue` from the Web Bluetooth API so the
 * SDK can run under both browsers and Node.js (e.g., via noble).
 */

export interface GattCharacteristicProperties {
  /** Whether `writeValue` is supported. */
  write: boolean;
  /** Whether `writeValueWithoutResponse` is supported. */
  writeWithoutResponse: boolean;
  /** Whether `readValue` is supported. */
  read: boolean;
  /** Whether `startNotifications` is supported. */
  notify: boolean;
}

export interface GattCharacteristicValueChangedEvent {
  value: DataView;
}

export interface GattCharacteristic {
  readonly uuid: string;
  readonly properties: GattCharacteristicProperties;
  readValue(): Promise<DataView>;
  writeValue(value: Uint8Array): Promise<void>;
  writeValueWithoutResponse(value: Uint8Array): Promise<void>;
  startNotifications(): Promise<void>;
  stopNotifications(): Promise<void>;
  addEventListener(
    type: 'characteristicvaluechanged',
    listener: (event: GattCharacteristicValueChangedEvent) => void,
  ): void;
  removeEventListener(
    type: 'characteristicvaluechanged',
    listener: (event: GattCharacteristicValueChangedEvent) => void,
  ): void;
}

export interface GattService {
  readonly uuid: string;
  getCharacteristic(uuid: string): Promise<GattCharacteristic>;
}

export interface GattServer {
  readonly connected: boolean;
  connect(): Promise<void>;
  disconnect(): void;
  getPrimaryService(uuid: string): Promise<GattService>;
  getPrimaryServices(uuid?: string): Promise<GattService[]>;
}

export interface GattDevice {
  readonly name: string | null;
  readonly gatt: GattServer;
  addEventListener(type: 'gattserverdisconnected', listener: () => void): void;
  removeEventListener(type: 'gattserverdisconnected', listener: () => void): void;
}

export interface RequestDeviceOptions {
  filters: { services: string[] }[];
  optionalServices?: string[];
}

export interface GattTransport {
  requestDevice(options: RequestDeviceOptions): Promise<GattDevice>;
}
