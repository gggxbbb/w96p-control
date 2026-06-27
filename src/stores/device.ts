import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { BatteryInfo, PowerStatus, MotorInfo, PowerConfigRegs } from '../ble/parsers';
import type { BleSnapshot } from '../ble/manager';

interface DeviceState {
  fanSpeed: number;
  timerRemainingSec: number;
  natureWindOn: boolean;
  shutdownDelaySec: number;
  gearDownMode: 0 | 1;
  speedCalib: [number, number, number, number];
  natureCurve: number[];
  battery: BatteryInfo | null;
  powerStatus: PowerStatus | null;
  motor: MotorInfo | null;
  powerConfig: PowerConfigRegs | null;
  setSnapshot: (snap: Partial<BleSnapshot>) => void;
  reset: () => void;
}

const initialState = {
  fanSpeed: 0,
  timerRemainingSec: 0,
  natureWindOn: false,
  shutdownDelaySec: 0,
  gearDownMode: 0 as 0 | 1,
  speedCalib: [30, 50, 70, 100] as [number, number, number, number],
  natureCurve: [] as number[],
  battery: null,
  powerStatus: null,
  motor: null,
  powerConfig: null,
};

export const useDeviceStore = create<DeviceState>()(
  subscribeWithSelector((set) => ({
    ...initialState,
    setSnapshot: (snap) => set(snap),
    reset: () => set(initialState),
  })),
);
