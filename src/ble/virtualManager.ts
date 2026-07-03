import type { IBleManager, BleState, BleSnapshot } from './types';
import type { BatteryInfo, PowerStatus, MotorInfo, PowerConfigRegs } from './parsers';
import type { PowReg } from './commands';
import { DEFAULT_CURVE } from '../lib/curvePresets';
import { DEFAULT_SPEEDS_FULL, DEFAULT_SPEEDS_COMPAT } from './profiles';

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

export class VirtualManager implements IBleManager {
  onState?: (s: BleState, deviceName?: string, _isCompat?: boolean) => void;
  onSnapshot?: (snap: BleSnapshot) => void;
  onError?: (msg: string) => void;

  isCompatMode = false;

  // 虚拟设备型号
  private virtualIsCompat = false;

  // 内部状态
  private pollId: number | null = null;
  private timerInterval: number | null = null;
  private startTime = 0;

  // 设备状态
  private fanSpeed = 50;
  private timerRemainingSec = 0;
  private natureWindOn = false;
  private shutdownDelaySec = 60;
  private gearDownMode: 0 | 1 = 0;
  private speedCalib: [number, number, number, number] = [...DEFAULT_SPEEDS_FULL];
  private natureCurve: number[] = [...DEFAULT_CURVE];
  private batteryCapacityMwh = 18000;
  private powerConfigRegs: PowerConfigRegs = {
    powLevel: 75, powVer: 0, powSink: 1, powSrc: 1,
    powCoreTemp: 42,
    pow1A: 0x1C, pow1C: 0x00, pow1D: 0x00, pow1E: 0x00,
    pow2A: 0x00, pow2B: 0x10, pow2C: 0x04,
  };
  private powCOut = true;
  private powCIn = true;

  // 自然风曲线播放位置
  private curvePosition = 0;

  setVirtualProfile(compat: boolean) {
    this.virtualIsCompat = compat;
    this.speedCalib = [...(compat ? DEFAULT_SPEEDS_COMPAT : DEFAULT_SPEEDS_FULL)] as [number, number, number, number];
  }

  async connect(): Promise<void> {
    this.onState?.('connecting');
    await sleep(300);
    this.isCompatMode = this.virtualIsCompat;
    const name = this.virtualIsCompat ? '虚拟 W66D' : '虚拟 W96P';
    this.speedCalib = [...(this.virtualIsCompat ? DEFAULT_SPEEDS_COMPAT : DEFAULT_SPEEDS_FULL)] as [number, number, number, number];
    this.fanSpeed = this.speedCalib[1];
    this.onState?.('connected', name, this.isCompatMode);
    setTimeout(() => { void this.readInitial(); }, 1500);
  }

  private async readInitial(): Promise<void> {
    this.onSnapshot?.({
      timerRemainingSec: this.timerRemainingSec,
      speedCalib: this.speedCalib,
      natureWindOn: this.natureWindOn,
      gearDownMode: this.gearDownMode,
      shutdownDelaySec: this.shutdownDelaySec,
      natureCurve: this.natureCurve,
      powerConfig: { ...this.powerConfigRegs },
      firmwareVersion: '1.30',
      serialNumber: this.virtualIsCompat ? '21110042' : '21030001',
      isCompatMode: this.isCompatMode,
    });
  }

  startPolling(intervalMs: number): void {
    if (this.pollId !== null) clearInterval(this.pollId);
    this.pollId = window.setInterval(() => { void this.pollOnce(); }, intervalMs);
    if (this.timerInterval !== null) clearInterval(this.timerInterval);
    this.timerInterval = window.setInterval(() => {
      if (this.timerRemainingSec > 0) {
        this.timerRemainingSec--;
      }
    }, 1000);
  }

  stopPolling(): void {
    if (this.pollId !== null) { clearInterval(this.pollId); this.pollId = null; }
    if (this.timerInterval !== null) { clearInterval(this.timerInterval); this.timerInterval = null; }
  }

  private async pollOnce(): Promise<void> {
    const t = (Date.now() - this.startTime) / 1000;

    const batCycle = Math.sin(t / 10);
    const isCharging = batCycle > 0;
    const batCurrent = Math.round(batCycle * 500);
    const batVoltage = 3700 + Math.round(batCycle * 50);
    const battery: BatteryInfo = {
      voltageMv: batVoltage,
      currentMa: batCurrent,
      capacityMwh: this.batteryCapacityMwh,
      chgMwh: 0, dchgMwh: 0, rcapMwh: 0,
      tempC: 0, chgTimeS: 0, dchgTimeS: 0,
    };

    const powerStatus: PowerStatus = {
      vbusVmV: isCharging ? 5000 : 0,
      vbusCurMa: isCharging ? 1000 : 0,
      vbusConnected: isCharging,
      powC: isCharging ? 1 : 0,
      powSta: isCharging ? 1 : 0,
      powCOut: this.powCOut,
      powCIn: this.powCIn,
      powCHi: false,
    };

    let currentSpeed: number;
    if (this.natureWindOn) {
      currentSpeed = this.natureCurve[this.curvePosition % 128];
      this.curvePosition++;
      currentSpeed = Math.max(0, Math.min(100, currentSpeed));
    } else {
      currentSpeed = this.fanSpeed + Math.round((Math.random() - 0.5) * 4);
      currentSpeed = Math.max(0, Math.min(100, currentSpeed));
    }

    const motorCurrent = Math.max(0, Math.round(currentSpeed * 27 + (Math.random() - 0.5) * 50));
    const motorVoltage = !this.isCompatMode
      ? 4800 + Math.round(Math.sin(t / 5) * 50)
      : 0;
    const stalled = Math.random() < 0.002;

    const motor: MotorInfo = {
      currentMa: motorCurrent,
      block: stalled,
      voltageMv: motorVoltage,
    };

    this.onSnapshot?.({
      fanSpeed: currentSpeed,
      battery,
      powerStatus,
      motor,
      powerConfig: { ...this.powerConfigRegs },
      natureWindOn: this.natureWindOn,
      gearDownMode: this.gearDownMode,
      timerRemainingSec: this.timerRemainingSec,
    });
  }

  async readTimer(): Promise<number> { return this.timerRemainingSec; }
  async readNatureCurve(): Promise<number[]> { return [...this.natureCurve]; }
  async readBatteryCapacity(): Promise<number> { return this.batteryCapacityMwh; }

  async writeGear(gear: 0 | 1 | 2 | 3 | 4): Promise<void> {
    if (gear === 0) {
      this.fanSpeed = 0;
    } else {
      this.fanSpeed = this.speedCalib[gear - 1];
    }
    if (gear !== 0 && this.natureWindOn) {
      this.natureWindOn = false;
    }
    this.onSnapshot?.({ fanSpeed: this.fanSpeed, natureWindOn: this.natureWindOn });
  }

  async writeFanSpeed(pct: number): Promise<void> {
    this.fanSpeed = pct;
    if (this.natureWindOn) this.natureWindOn = false;
    this.onSnapshot?.({ fanSpeed: pct, natureWindOn: false });
  }

  async writeNatureWind(on: boolean): Promise<void> {
    this.natureWindOn = on;
    this.curvePosition = 0;
    this.onSnapshot?.({ natureWindOn: on });
  }

  async writeTimer(sec: number): Promise<void> {
    this.timerRemainingSec = sec;
    this.onSnapshot?.({ timerRemainingSec: this.timerRemainingSec });
  }

  async writeShutdownDelay(sec: number): Promise<void> {
    this.shutdownDelaySec = sec < 10 && sec > 0 ? 10 : sec;
    this.onSnapshot?.({ shutdownDelaySec: this.shutdownDelaySec });
  }

  async writeGearDownMode(mode: 0 | 1): Promise<void> {
    this.gearDownMode = mode;
    this.onSnapshot?.({ gearDownMode: mode });
  }

  async writeSpeedCalib(speeds: [number, number, number, number]): Promise<void> {
    this.speedCalib = speeds;
    this.onSnapshot?.({ speedCalib: speeds });
  }

  async writeNatureCurve(points: number[]): Promise<void> {
    if (points.length !== 128) throw new Error('自然风曲线必须 128 点');
    this.natureCurve = [...points];
  }

  async writeBatteryCapacity(mah: number, v: number): Promise<void> {
    this.batteryCapacityMwh = Math.round(mah * v);
  }

  async writePowCOut(enable: boolean): Promise<void> { this.powCOut = enable; }
  async writePowCIn(enable: boolean): Promise<void> { this.powCIn = enable; }

  async readNatureWindSum?(): Promise<number> { return 128; }
  async readNatureWindTime?(): Promise<number> { return 3600; }
  async writePowCHi(_enable: boolean): Promise<void> { /* no-op */ }
  async writeNatureWindCtrl(_op: 1 | 2): Promise<void> { /* no-op */ }
  async writeBatteryClr(): Promise<void> { /* no-op */ }
  async writePowerClr(): Promise<void> { /* no-op */ }

  async writeTurbo?(_on: boolean): Promise<void> { /* no-op */ }
  async writeTurboTime?(_sec: number): Promise<void> { /* no-op */ }
  async writeLight?(_value: number): Promise<void> { /* no-op */ }
  async writeBleName?(_name: string): Promise<void> { /* no-op */ }
  async readTurboCountdown?(): Promise<number> { return 0; }
  async readTurbo?(): Promise<number> { return 0; }

  async writePowSwitch(reg: PowReg, bit: number, enable: boolean, inverted: boolean): Promise<void> {
    const value = inverted ? !enable : enable;
    const mask = 1 << bit;
    const regKey = `pow${reg}` as keyof PowerConfigRegs;
    const cur = this.powerConfigRegs[regKey];
    const next = value ? (cur | mask) : (cur & ~mask);
    this.powerConfigRegs[regKey] = next;
    this.onSnapshot?.({ powerConfig: { ...this.powerConfigRegs } });
  }

  async writePowRegister(reg: PowReg, byte: number): Promise<void> {
    const regKey = `pow${reg}` as keyof PowerConfigRegs;
    this.powerConfigRegs[regKey] = byte;
    this.onSnapshot?.({ powerConfig: { ...this.powerConfigRegs } });
  }

  disconnect(): void {
    this.stopPolling();
    this.onState?.('idle');
  }
}
