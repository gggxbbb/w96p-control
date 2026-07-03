import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { BatteryInfo, PowerStatus, MotorInfo, PowerConfigRegs } from '../ble/parsers';
import type { BleSnapshot } from '../ble/manager';
import { useBatteryLearnStore } from './batteryLearn';
import { voltageToSoc } from '../utils/battery';

let _lastLearnTick = 0;

interface DeviceState {
  fanSpeed: number;
  timerRemainingSec: number;
  natureWindOn: boolean;
  natureWindSum: number;
  natureWindTime: number;
  shutdownDelaySec: number;
  gearDownMode: 0 | 1;
  speedCalib: [number, number, number, number];
  natureCurve: number[];
  natureCurveReadAt: number | null;
  battery: BatteryInfo | null;
  powerStatus: PowerStatus | null;
  motor: MotorInfo | null;
  powerConfig: PowerConfigRegs | null;
  serialNumber: string | null;
  firmwareVersion: string | null;
  turboCountdownSec: number;
  setSnapshot: (snap: Partial<BleSnapshot>) => void;
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
};

export const useDeviceStore = create<DeviceState>()(
  subscribeWithSelector((set) => ({
    ...initialState,
    setSnapshot: (snap) => set((state) => {
      const next: Partial<DeviceState> = { ...state };
      // Shallow copy for flat fields
      for (const key of Object.keys(snap) as (keyof BleSnapshot)[]) {
        if (key === 'battery' || key === 'powerStatus' || key === 'motor' || key === 'powerConfig') continue;
        (next as any)[key] = (snap as any)[key];
      }
      // Deep merge nested objects (supports partial updates from optimistic writes)
      if (snap.battery && state.battery) next.battery = { ...state.battery, ...snap.battery };
      else if (snap.battery !== undefined) next.battery = snap.battery;

      // 电池学习：每次轮询到达时静默积分（直接调用 store，不依赖 React 渲染）
      if (next.battery) {
        const now = Date.now();
        if (now - _lastLearnTick >= 400) {  // 最多 ~2.5Hz，避免过度积分
          _lastLearnTick = now;
          const serial = next.serialNumber;
          if (serial) {
            const ps = next.powerStatus;
            const soc = voltageToSoc(next.battery.voltageMv);
            useBatteryLearnStore.getState().tick(
              serial,
              next.battery.capacityMwh || 18000,
              next.battery.voltageMv,
              next.battery.currentMa,
              ps?.powSta === 1,
              soc,
              now,
            );
          }
        }
      }
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
