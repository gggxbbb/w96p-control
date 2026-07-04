/**
 * 设备状态 Store
 *
 * 维护所有从设备读取的数据（转速、电池、电源、电机等）。
 * 通过 {@link setSnapshot} 接收 {@link BleManager} 推送的状态更新。
 * 支持 Zustand 订阅（如 batteryLearn 外部订阅）。
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { BatteryInfo, PowerStatus, MotorInfo, PowerConfigRegs } from '../ble/parsers';
import type { BleSnapshot } from '../ble/manager';

/** 设备完整状态 */
export interface DeviceState {
  /** 当前风扇转速 (0-100) */
  fanSpeed: number;
  /** 定时器剩余秒数 */
  timerRemainingSec: number;
  /** 自然风是否开启 */
  natureWindOn: boolean;
  /** 自然风累计点数 */
  natureWindSum: number;
  /** 自然风运行总时长 */
  natureWindTime: number;
  /** 关机延迟秒数 */
  shutdownDelaySec: number;
  /** 降档模式 */
  gearDownMode: 0 | 1;
  /** 档位风速校准 [1档, 2档, 3档, 4档] */
  speedCalib: [number, number, number, number];
  /** 自然风曲线 (128 点) */
  natureCurve: number[];
  /** 自然风曲线读取时间 */
  natureCurveReadAt: number | null;
  /** 电池信息 */
  battery: BatteryInfo | null;
  /** 电源状态 */
  powerStatus: PowerStatus | null;
  /** 电机信息 */
  motor: MotorInfo | null;
  /** 电源配置寄存器 */
  powerConfig: PowerConfigRegs | null;
  /** 设备序列号 */
  serialNumber: string | null;
  /** 固件版本 */
  firmwareVersion: string | null;
  /** Turbo 剩余倒计时 */
  turboCountdownSec: number;
  /** BLE 序列号显示状态 */
  bleSnEnabled: boolean;

  /** 从 {@link BleSnapshot} 更新状态（合并模式） */
  setSnapshot: (snap: Partial<BleSnapshot>) => void;
  /** 重置所有状态为初始值 */
  reset: () => void;
}

const initialState = {
  fanSpeed: 0,
  timerRemainingSec: 0,
  natureWindOn: false,
  natureWindSum: 0,
  natureWindTime: 0,
  shutdownDelaySec: 0,
  gearDownMode: 0 as 0 | 1,
  speedCalib: [30, 50, 70, 100] as [number, number, number, number],
  natureCurve: [] as number[],
  natureCurveReadAt: null as number | null,
  battery: null,
  powerStatus: null,
  motor: null,
  powerConfig: null,
  serialNumber: null,
  firmwareVersion: null,
  turboCountdownSec: 0,
  bleSnEnabled: false,
};

/** 设备状态 Zustand Store（支持选择器订阅） */
export const useDeviceStore = create<DeviceState>()(
  subscribeWithSelector((set) => ({
    ...initialState,

    /** 合并方式更新设备状态，支持嵌套对象部分更新 */
    setSnapshot: (snap) => set((state) => {
      const next: Partial<DeviceState> = { ...state };
      for (const key of Object.keys(snap) as (keyof BleSnapshot)[]) {
        if (key === 'battery' || key === 'powerStatus' || key === 'motor' || key === 'powerConfig') continue;
        (next as any)[key] = (snap as any)[key];
      }
      if (snap.battery && state.battery) next.battery = { ...state.battery, ...snap.battery };
      else if (snap.battery !== undefined) next.battery = snap.battery;
      if (snap.powerStatus && state.powerStatus) next.powerStatus = { ...state.powerStatus, ...snap.powerStatus };
      else if (snap.powerStatus !== undefined) next.powerStatus = snap.powerStatus;
      if (snap.motor && state.motor) next.motor = { ...state.motor, ...snap.motor };
      else if (snap.motor !== undefined) next.motor = snap.motor;
      if (snap.powerConfig && state.powerConfig) next.powerConfig = { ...state.powerConfig, ...snap.powerConfig };
      else if (snap.powerConfig !== undefined) next.powerConfig = snap.powerConfig;
      return next as DeviceState;
    }),

    reset: () => set(initialState),
  })),
);
