import { useMemo, useState } from 'react';
import { BleManager } from '../ble/manager';
import { VirtualManager } from '../ble/virtualManager';
import type { IBleManager } from '../ble/types';
import type { PowReg } from '../ble/commands';
import { useConnectionStore } from '../stores/connection';
import { useDeviceStore } from '../stores/device';
import { useSettingsStore } from '../stores/settings';
import { useToastStore } from '../stores/toast';

let managerInstance: IBleManager | null = null;
let isVirtual = false;

function bindCallbacks(m: IBleManager) {
  m.onState = (s, name, isCompat) => {
    const conn = useConnectionStore.getState();
    if (s === 'connecting') conn.setConnecting();
    else if (s === 'connected' && name) {
      conn.setConnected(name, isCompat ?? false);
      useSettingsStore.getState().setLastDeviceName(name);
    } else if (s === 'error') conn.setError('连接失败');
    else if (s === 'idle') {
      conn.setDisconnected();
      useDeviceStore.getState().reset();
    }
  };
  m.onSnapshot = (snap) => {
    useDeviceStore.getState().setSnapshot(snap);
  };
  m.onError = (msg) => {
    useToastStore.getState().show(msg);
  };
}

// 清除旧 manager 的回调并停止其活动，避免异步事件污染新连接状态
function teardown(m: IBleManager) {
  m.onState = undefined;
  m.onSnapshot = undefined;
  m.onError = undefined;
  m.stopPolling();
  m.disconnect();
}

function getManager(): IBleManager {
  if (!managerInstance) {
    managerInstance = new BleManager();
    bindCallbacks(managerInstance);
  }
  return managerInstance;
}

export function useBle() {
  const manager = useMemo(getManager, []);
  const state = useConnectionStore((s) => s.state);
  const isCompatMode = useConnectionStore((s) => s.isCompatMode);
  const deviceName = useConnectionStore((s) => s.deviceName);
  const pollInterval = useSettingsStore((s) => s.pollIntervalMs);
  const [isVirtualDevice, setIsVirtualDevice] = useState(isVirtual);

  const connectReal = () => {
    if (managerInstance && isVirtual) {
      teardown(managerInstance);
      managerInstance = null;
    }
    if (!managerInstance) {
      managerInstance = new BleManager();
      bindCallbacks(managerInstance);
    }
    isVirtual = false;
    setIsVirtualDevice(false);
    void managerInstance.connect();
  };

  const connectVirtual = (compat: boolean) => {
    if (managerInstance) teardown(managerInstance);
    const vm = new VirtualManager();
    vm.setVirtualProfile(compat);
    bindCallbacks(vm);
    managerInstance = vm;
    isVirtual = true;
    setIsVirtualDevice(true);
    void vm.connect();
  };

  const disconnect = () => {
    managerInstance?.disconnect();
    if (isVirtual) {
      managerInstance = null;
      isVirtual = false;
      setIsVirtualDevice(false);
    }
  };

  // 当前活跃 manager（确保拿到最新实例）
  const m = managerInstance ?? manager;
  return {
    state,
    isCompatMode,
    deviceName,
    isConnected: state === 'connected',
    isVirtualDevice,
    connectReal,
    connectVirtual,
    disconnect,
    setGear: (g: 0 | 1 | 2 | 3 | 4) => m.writeGear(g),
    setFanSpeed: (p: number) => m.writeFanSpeed(p),
    toggleNatureWind: (on: boolean) => m.writeNatureWind(on),
    setTimer: (sec: number) => m.writeTimer(sec),
    cancelTimer: () => m.writeTimer(0),
    setShutdownDelay: (s: number) => m.writeShutdownDelay(s),
    setGearDownMode: (mode: 0 | 1) => m.writeGearDownMode(mode),
    setSpeedCalib: (s: [number, number, number, number]) => m.writeSpeedCalib(s),
    setNatureCurve: (p: number[]) => m.writeNatureCurve(p),
    setBatteryCapacity: (mah: number, v: number) => m.writeBatteryCapacity(mah, v),
    setPowCOut: (on: boolean) => m.writePowCOut(on),
    setPowCIn: (on: boolean) => m.writePowCIn(on),
    setPowCHi: (on: boolean) => m.writePowCHi(on),
    writeNatureWindCtrl: (op: 1 | 2) => m.writeNatureWindCtrl(op),
    writeBatteryClr: () => m.writeBatteryClr(),
    writePowerClr: () => m.writePowerClr(),
    setPowSwitch: (reg: PowReg, bit: number, enable: boolean, inverted: boolean) =>
      m.writePowSwitch(reg, bit, enable, inverted),
    setPowRegister: (reg: PowReg, byte: number) => m.writePowRegister(reg, byte),
    readTimer: () => m.readTimer(),
    readNatureCurve: () => m.readNatureCurve(),
    readBatteryCapacity: () => m.readBatteryCapacity(),
    startPolling: () => m.startPolling(pollInterval),
    stopPolling: () => m.stopPolling(),
    /** v1.3+ Turbo 模式开关 */
    setTurbo: (on: boolean) => m.writeTurbo?.(on) ?? Promise.resolve(),
    /** v1.3+ Turbo 时间设置 (1-199 秒) */
    setTurboTime: (sec: number) => m.writeTurboTime?.(sec) ?? Promise.resolve(),
    /** v1.3+ 临时关灯 */
    lightOff: () => m.writeLightOff?.() ?? Promise.resolve(),
    /** v1.3+ 蓝牙名称修改 */
    setBleName: (name: string) => m.writeBleName?.(name) ?? Promise.resolve(),
    /** v1.4+ 读取 Turbo 剩余倒计时 */
    readTurboCountdown: () => m.readTurboCountdown?.() ?? Promise.resolve(0),
    readTurboTime: () => m.readTurboTime?.() ?? Promise.resolve(0),
    manager: m,
  };
}

let _pollPaused = false;

/** OTA 升级期间暂停/恢复风扇轮询，避免 GATT 资源竞争 */
export function usePausePolling() {
  const ble = useBle();
  const { stopPolling, startPolling } = ble;

  return {
    pause: () => {
      _pollPaused = true;
      stopPolling();
    },
    resume: () => {
      if (_pollPaused) {
        startPolling();
        _pollPaused = false;
      }
    },
  };
}
