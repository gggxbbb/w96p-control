/**
 * BLE 核心类型定义
 */

import type { BatteryInfo, PowerStatus, MotorInfo, PowerConfigRegs } from './parsers.js';
import type { PowReg } from './commands.js';

/** BLE 连接状态 */
export type BleState = 'idle' | 'connecting' | 'connected' | 'error';

/** 设备状态快照（每次轮询或用户操作后更新） */
export interface BleSnapshot {
  /** 当前风扇转速 (0-100) */
  fanSpeed?: number;
  /** 定时器剩余秒数 */
  timerRemainingSec?: number;
  /** 自然风是否开启 */
  natureWindOn?: boolean;
  /** 自然风累计点数 */
  natureWindSum?: number;
  /** 自然风运行总时长 */
  natureWindTime?: number;
  /** 关机延迟秒数 */
  shutdownDelaySec?: number;
  /** 降档模式 (0=关, 1=开) */
  gearDownMode?: 0 | 1;
  /** 档位风速校准 [1档, 2档, 3档, 4档] */
  speedCalib?: [number, number, number, number];
  /** 自然风曲线 (128 点) */
  natureCurve?: number[];
  /** 电池信息 */
  battery?: BatteryInfo;
  /** 电源状态 */
  powerStatus?: PowerStatus;
  /** 电机信息 */
  motor?: MotorInfo;
  /** 电源配置寄存器 */
  powerConfig?: PowerConfigRegs;
  /** 设备序列号（通过 FEE0 DFU 服务查询） */
  serialNumber?: string;
  /** 固件版本（通过 FEE0 DFU 服务查询） */
  firmwareVersion?: string;
  /** 兼容模式标记 */
  isCompatMode?: boolean;
  /** v1.5+ Turbo 剩余倒计时（秒） */
  turboCountdownSec?: number;
  /** v1.7+ BLE 序列号显示状态 */
  bleSnEnabled?: boolean;
}

/**
 * BLE 管理器接口
 *
 * 定义了操作设备的完整能力。{@link BleManager}（真机）和
 * {@link VirtualManager}（虚拟设备）均实现此接口。
 */
export interface IBleManager {
  /** 是否兼容模式 */
  isCompatMode: boolean;

  /** 连接状态变化回调 */
  onState?: (s: BleState, deviceName?: string, _isCompat?: boolean) => void;
  /** 设备状态快照回调 */
  onSnapshot?: (snap: BleSnapshot) => void;
  /** 错误回调 */
  onError?: (msg: string) => void;

  /** 建立 BLE 连接 */
  connect(): Promise<void>;
  /** 断开连接 */
  disconnect(): void;

  /** 开始轮询设备状态 */
  startPolling(intervalMs: number): void;
  /** 停止轮询 */
  stopPolling(): void;

  // ── 读取 ──
  readTimer(): Promise<number>;
  readNatureCurve(): Promise<number[]>;
  readBatteryCapacity(): Promise<number>;
  readNatureWindSum?(): Promise<number>;
  readNatureWindTime?(): Promise<number>;

  // ── 写入 ──
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

  // ── v1.3+ 可选功能 ──
  /** Turbo 模式开关 */
  writeTurbo?(on: boolean): Promise<void>;
  /** Turbo 时间设置 (1-199 秒) */
  writeTurboTime?(sec: number): Promise<void>;
  /** 灯光亮度 (0=关灯, 1-4=亮度等级) */
  writeLight?(value: number): Promise<void>;
  /** 蓝牙名称修改 */
  writeBleName?(name: string): Promise<void>;
  /** v1.7+ BLE 序列号显示开关 */
  writeBleSn?(enabled: boolean): Promise<void>;
  /** 读取 BLE 序列号显示状态 */
  readBleSn?(): Promise<boolean>;
  /** v1.4+ 读取 Turbo 剩余倒计时 */
  readTurboCountdown?(): Promise<number>;
  /** v1.4+ 读取 Turbo 当前状态 */
  readTurbo?(): Promise<number>;
  /** 读取 Turbo 时间 (FFF8) */
  readTurboTime?(): Promise<number>;
}
