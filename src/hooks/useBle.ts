import { useMemo } from 'react';
import { BleManager } from '../ble/manager';
import type { PowReg } from '../ble/commands';
import { useConnectionStore } from '../stores/connection';
import { useDeviceStore } from '../stores/device';
import { useSettingsStore } from '../stores/settings';
import { useToastStore } from '../stores/toast';

let managerInstance: BleManager | null = null;

function getManager(): BleManager {
  if (!managerInstance) {
    managerInstance = new BleManager();
    managerInstance.onState = (s, name, profile) => {
      const conn = useConnectionStore.getState();
      if (s === 'connecting') conn.setConnecting();
      else if (s === 'connected' && name && profile) {
        conn.setConnected(name, profile);
        useSettingsStore.getState().setLastDeviceName(name);
      } else if (s === 'error') conn.setError('连接失败');
      else if (s === 'idle') {
        conn.setDisconnected();
        useDeviceStore.getState().reset();
      }
    };
    managerInstance.onSnapshot = (snap) => {
      useDeviceStore.getState().setSnapshot(snap);
    };
    managerInstance.onError = (msg) => {
      useToastStore.getState().show(msg);
    };
  }
  return managerInstance;
}

export function useBle() {
  const manager = useMemo(getManager, []);
  const state = useConnectionStore((s) => s.state);
  const profile = useConnectionStore((s) => s.profile);
  const deviceName = useConnectionStore((s) => s.deviceName);
  const pollInterval = useSettingsStore((s) => s.pollIntervalMs);

  return {
    state,
    profile,
    deviceName,
    isConnected: state === 'connected',
    connect: () => manager.connect(),
    disconnect: () => manager.disconnect(),
    setGear: (g: 0 | 1 | 2 | 3 | 4) => manager.writeGear(g),
    setFanSpeed: (p: number) => manager.writeFanSpeed(p),
    toggleNatureWind: (on: boolean) => manager.writeNatureWind(on),
    setTimer: (m: number) => manager.writeTimer(m),
    cancelTimer: () => manager.writeTimer(0),
    setShutdownDelay: (s: number) => manager.writeShutdownDelay(s),
    setGearDownMode: (m: 0 | 1) => manager.writeGearDownMode(m),
    setSpeedCalib: (s: [number, number, number, number]) => manager.writeSpeedCalib(s),
    setNatureCurve: (p: number[]) => manager.writeNatureCurve(p),
    setBatteryCapacity: (mah: number, v: number) => manager.writeBatteryCapacity(mah, v),
    setPowCOut: (on: boolean) => manager.writePowCOut(on),
    setPowCIn: (on: boolean) => manager.writePowCIn(on),
    setPowSwitch: (reg: PowReg, bit: number, enable: boolean, inverted: boolean) =>
      manager.writePowSwitch(reg, bit, enable, inverted),
    setPowRegister: (reg: PowReg, byte: number) => manager.writePowRegister(reg, byte),
    readTimer: () => manager.readTimer(),
    readNatureCurve: () => manager.readNatureCurve(),
    readBatteryCapacity: () => manager.readBatteryCapacity(),
    startPolling: () => manager.startPolling(pollInterval),
    stopPolling: () => manager.stopPolling(),
    manager,
  };
}
