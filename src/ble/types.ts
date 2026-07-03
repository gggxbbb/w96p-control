import type { BatteryInfo, PowerStatus, MotorInfo, PowerConfigRegs } from './parsers';
import type { PowReg } from './commands';

export type BleState = 'idle' | 'connecting' | 'connected' | 'error';

export interface BleSnapshot {
  fanSpeed?: number;
  timerRemainingSec?: number;
  natureWindOn?: boolean;
  natureWindSum?: number;
  natureWindTime?: number;
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
  /** 兼容模式（FEE0 DFU 服务查询） */
  isCompatMode?: boolean;
  /** v1.5+ Turbo 剩余倒计时（秒） */
  turboCountdownSec?: number;
}

export interface IBleManager {
  isCompatMode: boolean;
  onState?: (s: BleState, deviceName?: string, _isCompat?: boolean) => void;
  onSnapshot?: (snap: BleSnapshot) => void;
  onError?: (msg: string) => void;
  connect(): Promise<void>;
  disconnect(): void;
  startPolling(intervalMs: number): void;
  stopPolling(): void;
  readTimer(): Promise<number>;
  readNatureCurve(): Promise<number[]>;
  readBatteryCapacity(): Promise<number>;
  readNatureWindSum?(): Promise<number>;
  readNatureWindTime?(): Promise<number>;
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
  writePowCHi(enable: boolean): Promise<void>;
  writeNatureWindCtrl(op: 1 | 2): Promise<void>;
  writeBatteryClr(): Promise<void>;
  writePowerClr(): Promise<void>;
  writePowSwitch(reg: PowReg, bit: number, enable: boolean, inverted: boolean): Promise<void>;
  writePowRegister(reg: PowReg, byte: number): Promise<void>;
  /** v1.3+ Turbo 模式开关 */
  writeTurbo?(on: boolean): Promise<void>;
  /** v1.3+ Turbo 时间设置 (1-199 秒，0=恢复默认) */
  writeTurboTime?(sec: number): Promise<void>;
  /** v1.3+ 灯光亮度 (0=关灯, 1~4=低/中低/中高/最高) */
  writeLight?(value: number): Promise<void>;
  /** v1.3+ 蓝牙名称修改 */
  writeBleName?(name: string): Promise<void>;
  /** v1.4+ 读取 Turbo 剩余倒计时 */
  readTurboCountdown?(): Promise<number>;
  /** v1.4+ 读取 Turbo 当前状态 */
  readTurbo?(): Promise<number>;
  /** 读取 Turbo 时间 (FFF8) */
  readTurboTime?(): Promise<number>;
}
