import type { IBleManager, BleState, BleSnapshot } from './types';
import { PROFILES, type Profile } from './profiles';
import type { BatteryInfo, PowerStatus, MotorInfo, PowerConfigRegs } from './parsers';
import type { PowReg } from './commands';
import { DEFAULT_CURVE } from '../lib/curvePresets';

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

export class VirtualManager implements IBleManager {
  profile: Profile | null = null;
  onState?: (s: BleState, deviceName?: string, profile?: Profile) => void;
  onSnapshot?: (snap: BleSnapshot) => void;
  onError?: (msg: string) => void;

  // 虚拟设备型号（由 setVirtualProfile 设置）
  private virtualProfileName: 'W96P' | 'W66D' = 'W96P';

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
  private speedCalib: [number, number, number, number] = [10, 35, 70, 100];
  private natureCurve: number[] = [...DEFAULT_CURVE];
  private batteryCapacityMwh = 18000;
  private powerConfigRegs: PowerConfigRegs = {
    powVer: 0, powSink: 1, powSrc: 1,
    pow1A: 0x1C, pow1C: 0x00, pow1D: 0x00, pow1E: 0x00,
    pow2A: 0x00, pow2B: 0x10, pow2C: 0x04,
  };
  private powCOut = true;
  private powCIn = true;

  // 自然风曲线播放位置
  private curvePosition = 0;

  setVirtualProfile(name: 'W96P' | 'W66D') {
    this.virtualProfileName = name;
    const p = PROFILES[name];
    this.speedCalib = [...p.defaultSpeeds] as [number, number, number, number];
  }

  async connect(): Promise<void> {
    this.onState?.('connecting');
    await sleep(300);  // 模拟连接延迟
    this.profile = PROFILES[this.virtualProfileName];
    this.startTime = Date.now();
    // 按型号调整初始值
    this.speedCalib = [...this.profile.defaultSpeeds] as [number, number, number, number];
    this.fanSpeed = this.profile.defaultSpeeds[1];  // 默认 2 档
    this.onState?.('connected', `虚拟 ${this.virtualProfileName}`, this.profile);
    // 1.5s 后读初始状态（模拟真机）
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
      firmwareVersion: this.virtualProfileName === 'W96P' ? '1.20' : '1.11',
      serialNumber: this.virtualProfileName === 'W96P' ? '21030001' : '21110042',
    });
  }

  startPolling(intervalMs: number): void {
    if (this.pollId !== null) clearInterval(this.pollId);
    this.pollId = window.setInterval(() => { void this.pollOnce(); }, intervalMs);
    // 定时器单独每秒递减
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
    if (!this.profile) return;
    const t = (Date.now() - this.startTime) / 1000;  // 秒

    // 电池：模拟充放电循环（正弦）
    const batCycle = Math.sin(t / 10);  // -1..1
    const isCharging = batCycle > 0;
    const batCurrent = Math.round(batCycle * 500);  // ±500mA
    const batVoltage = 3700 + Math.round(batCycle * 50);  // 3650-3750mV
    const battery: BatteryInfo = {
      voltageMv: batVoltage,
      currentMa: batCurrent,
      capacityMwh: this.batteryCapacityMwh,
    };

    // VBUS：充电时 5000mV/1000mA，放电时 0
    const powerStatus: PowerStatus = {
      vbusVmV: isCharging ? 5000 : 0,
      vbusCurMa: isCharging ? 1000 : 0,
      vbusConnected: isCharging,
      powC: isCharging ? 1 : 0,
      powSta: isCharging ? 1 : 0,
      powCOut: this.powCOut,
      powCIn: this.powCIn,
      powCHi: 0,
    };

    // 转速：自然风开启时按曲线点位变化，否则基础值+小幅噪声
    let currentSpeed: number;
    if (this.natureWindOn) {
      currentSpeed = this.natureCurve[this.curvePosition % 128];
      this.curvePosition++;
      // 钳制到 profile 范围
      currentSpeed = Math.max(this.profile.minSpeed, Math.min(this.profile.maxSpeed, currentSpeed));
    } else {
      currentSpeed = this.fanSpeed + Math.round((Math.random() - 0.5) * 4);  // ±2 噪声
      currentSpeed = Math.max(0, Math.min(100, currentSpeed));
    }

    // 电机电流：随转速变化 + 噪声（满转速 100% → 约 2700mA → 4.8V × 2.7A ≈ 13W）
    const motorCurrent = Math.max(0, Math.round(currentSpeed * 27 + (Math.random() - 0.5) * 50));

    // 电机电压：W96P 返回，W66D 不返回（parseMotorFull）
    const motorVoltage = this.profile.parseMotorFull
      ? 4800 + Math.round(Math.sin(t / 5) * 50)
      : 0;

    // 堵转：0.2% 概率（演示用，偶尔触发）
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

  async writePowSwitch(reg: PowReg, bit: number, enable: boolean, inverted: boolean): Promise<void> {
    // inverted=true 表示 0=使能（多数位），enable=true 表示用户想"使能"
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
    this.profile = null;
    this.onState?.('idle');
  }
}
