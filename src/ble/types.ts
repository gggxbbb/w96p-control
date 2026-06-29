import type { Profile } from './profiles';
import type { BatteryInfo, PowerStatus, MotorInfo, PowerConfigRegs } from './parsers';
import type { PowReg } from './commands';

export type BleState = 'idle' | 'connecting' | 'connected' | 'error';

export interface BleSnapshot {
  fanSpeed?: number;
  timerRemainingSec?: number;
  natureWindOn?: boolean;
  shutdownDelaySec?: number;
  gearDownMode?: 0 | 1;
  speedCalib?: [number, number, number, number];
  natureCurve?: number[];
  battery?: BatteryInfo;
  powerStatus?: PowerStatus;
  motor?: MotorInfo;
  powerConfig?: PowerConfigRegs;
  /** 设备序列号（FEE0 DFU 服务查询） */
  serialNumber?: string;
  /** 固件版本（FEE0 DFU 服务查询） */
  firmwareVersion?: string;
}

export interface IBleManager {
  profile: Profile | null;
  onState?: (s: BleState, deviceName?: string, profile?: Profile) => void;
  onSnapshot?: (snap: BleSnapshot) => void;
  onError?: (msg: string) => void;
  connect(): Promise<void>;
  disconnect(): void;
  startPolling(intervalMs: number): void;
  stopPolling(): void;
  readTimer(): Promise<number>;
  readNatureCurve(): Promise<number[]>;
  readBatteryCapacity(): Promise<number>;
  writeGear(gear: 0 | 1 | 2 | 3 | 4): Promise<void>;
  writeFanSpeed(pct: number): Promise<void>;
  writeNatureWind(on: boolean): Promise<void>;
  writeTimer(minutes: number): Promise<void>;
  writeShutdownDelay(sec: number): Promise<void>;
  writeGearDownMode(mode: 0 | 1): Promise<void>;
  writeSpeedCalib(speeds: [number, number, number, number]): Promise<void>;
  writeNatureCurve(points: number[]): Promise<void>;
  writeBatteryCapacity(mah: number, v: number): Promise<void>;
  writePowCOut(enable: boolean): Promise<void>;
  writePowCIn(enable: boolean): Promise<void>;
  writePowSwitch(reg: PowReg, bit: number, enable: boolean, inverted: boolean): Promise<void>;
  writePowRegister(reg: PowReg, byte: number): Promise<void>;
}
