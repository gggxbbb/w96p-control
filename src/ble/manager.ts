import { SERVICES, CHARS, ALL_OPTIONAL_SERVICES } from './uuids';
import { pickProfile, type Profile } from './profiles';
import {
  parseBatteryInfo, parsePowerStatus, parseMotorInfo, parsePowerConfig,
  type BatteryInfo, type PowerStatus, type MotorInfo, type PowerConfigRegs,
} from './parsers';
import { cmd, encodeCmd, type PowReg } from './commands';
import { WriteQueue } from './writer';

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
}

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
const u8 = (dv: DataView, off = 0) => dv.byteLength > off ? dv.getUint8(off) : 0;
const u16be = (dv: DataView, off = 0) =>
  dv.byteLength >= off + 2 ? dv.getUint16(off, false) : 0;

export class BleManager {
  private device: BluetoothDevice | null = null;
  private chars = new Map<string, BluetoothRemoteGATTCharacteristic>();
  private writer = new WriteQueue();
  private pollId: number | null = null;
  profile: Profile | null = null;

  onState?: (s: BleState, deviceName?: string, profile?: Profile) => void;
  onSnapshot?: (snap: BleSnapshot) => void;
  onError?: (msg: string) => void;

  async connect(): Promise<void> {
    this.onState?.('connecting');
    try {
      this.device = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix: 'W' }],
        optionalServices: ALL_OPTIONAL_SERVICES,
      });
      this.device.addEventListener('gattserverdisconnected', () => this.cleanup());
      const gatt = this.device.gatt!;
      await gatt.connect();
      const main = await gatt.getPrimaryService(SERVICES.MAIN);
      const power = await gatt.getPrimaryService(SERVICES.POWER);
      const nature = await gatt.getPrimaryService(SERVICES.NATURE);
      for (const uuid of Object.values(CHARS)) {
        let svc = main;
        if (uuid.startsWith('0000ffd')) svc = power;
        else if (uuid.startsWith('0000ffe')) svc = nature;
        this.chars.set(uuid, await svc.getCharacteristic(uuid));
      }
      this.profile = pickProfile(this.device.name ?? undefined);
      this.writer.setNatureWindChar(this.chars.get(CHARS.NATURE_WIND)!);
      this.writer.setRegChar(this.chars.get(CHARS.POWER_CONFIG)!);
      this.onState?.('connected', this.device.name ?? '未知', this.profile);
      setTimeout(() => { void this.readInitial(); }, 1500);
    } catch (e) {
      this.onState?.('error');
      this.onError?.(String(e instanceof Error ? e.message : e));
    }
  }

  private async readInitial(): Promise<void> {
    if (!this.profile) return;
    try {
      const [timer, calib, nw, gdm, sd] = await Promise.all([
        this.chars.get(CHARS.TIMER)!.readValue(),
        this.chars.get(CHARS.SPEED_CALIB)!.readValue(),
        this.chars.get(CHARS.NATURE_WIND)!.readValue(),
        this.chars.get(CHARS.GEAR_DOWN_MODE)!.readValue(),
        this.chars.get(CHARS.SHUTDOWN_DELAY)!.readValue(),
      ]);
      const timerDv = new DataView(timer.buffer);
      const calibDv = new DataView(calib.buffer);
      const nwDv = new DataView(nw.buffer);
      const gdmDv = new DataView(gdm.buffer);
      const sdDv = new DataView(sd.buffer);
      this.writer.setNatureWindOn(u8(nwDv) === 1);
      this.onSnapshot?.({
        timerRemainingSec: u16be(timerDv),
        speedCalib: [
          u8(calibDv, 0), u8(calibDv, 1), u8(calibDv, 2), u8(calibDv, 3),
        ],
        natureWindOn: u8(nwDv) === 1,
        gearDownMode: u8(gdmDv) as 0 | 1,
        shutdownDelaySec: u16be(sdDv),
      });
    } catch (e) {
      this.onError?.(String(e instanceof Error ? e.message : e));
    }
  }

  startPolling(intervalMs: number): void {
    if (this.pollId !== null) clearInterval(this.pollId);
    this.pollId = window.setInterval(() => { void this.pollOnce(); }, intervalMs);
  }
  stopPolling(): void {
    if (this.pollId !== null) {
      clearInterval(this.pollId);
      this.pollId = null;
    }
  }

  private async pollOnce(): Promise<void> {
    if (!this.profile) return;
    try {
      const [speed, bat, pwr, mot, nw, gdm, pc] = await Promise.all([
        this.chars.get(CHARS.FAN_SPEED)!.readValue(),
        this.chars.get(CHARS.BATTERY_INFO)!.readValue(),
        this.chars.get(CHARS.POWER_STATUS)!.readValue(),
        this.chars.get(CHARS.MOTOR_INFO)!.readValue(),
        this.chars.get(CHARS.NATURE_WIND)!.readValue(),
        this.chars.get(CHARS.GEAR_DOWN_MODE)!.readValue(),
        this.chars.get(CHARS.POWER_CONFIG)!.readValue(),
      ]);
      const speedDv = new DataView(speed.buffer);
      const batDv = new DataView(bat.buffer);
      const pwrDv = new DataView(pwr.buffer);
      const motDv = new DataView(mot.buffer);
      const nwDv = new DataView(nw.buffer);
      const gdmDv = new DataView(gdm.buffer);
      const pcDv = new DataView(pc.buffer);
      const natureOn = u8(nwDv) === 1;
      this.writer.setNatureWindOn(natureOn);
      this.onSnapshot?.({
        fanSpeed: u8(speedDv),
        battery: parseBatteryInfo(batDv),
        powerStatus: parsePowerStatus(pwrDv),
        motor: parseMotorInfo(motDv, this.profile),
        powerConfig: parsePowerConfig(pcDv),
        natureWindOn: natureOn,
        gearDownMode: u8(gdmDv) as 0 | 1,
      });
    } catch (e) {
      this.onError?.(String(e instanceof Error ? e.message : e));
    }
  }

  async readTimer(): Promise<number> {
    const v = await this.chars.get(CHARS.TIMER)!.readValue();
    return u16be(new DataView(v.buffer));
  }

  async readNatureCurve(): Promise<number[]> {
    const v = await this.chars.get(CHARS.NATURE_CURVE)!.readValue();
    const dv = new DataView(v.buffer);
    const arr: number[] = [];
    for (let i = 0; i < dv.byteLength; i++) arr.push(dv.getUint8(i));
    return arr;
  }

  async readBatteryCapacity(): Promise<number> {
    const v = await this.chars.get(CHARS.BATTERY_INFO)!.readValue();
    return parseBatteryInfo(new DataView(v.buffer)).capacityMwh;
  }

  async writeGear(gear: 0 | 1 | 2 | 3 | 4): Promise<void> {
    const char = this.chars.get(CHARS.POWER)!;
    await this.writer.enqueue(async () => {
      if (this.writer.isNatureWindOn() && this.writer.natureChar && gear !== 0) {
        await this.writer.rawWrite(this.writer.natureChar, new Uint8Array([0]));
        await sleep(100);
        this.writer.setNatureWindOn(false);
      }
      await this.writer.rawWrite(char, new Uint8Array([gear]));
    });
    this.onSnapshot?.({ natureWindOn: false });
  }

  async writeFanSpeed(pct: number): Promise<void> {
    const char = this.chars.get(CHARS.FAN_SPEED)!;
    await this.writer.writeFanSpeed(char, pct);
    this.onSnapshot?.({ fanSpeed: pct, natureWindOn: false });
  }

  async writeNatureWind(on: boolean): Promise<void> {
    const char = this.chars.get(CHARS.NATURE_WIND)!;
    await this.writer.enqueue(async () => {
      await this.writer.rawWrite(char, new Uint8Array([on ? 1 : 0]));
    });
    this.writer.setNatureWindOn(on);
    this.onSnapshot?.({ natureWindOn: on });
  }

  async writeTimer(minutes: number): Promise<void> {
    const char = this.chars.get(CHARS.TIMER)!;
    const sec = minutes * 60;
    const data = new Uint8Array([(sec >> 8) & 0xff, sec & 0xff]);
    await this.writer.enqueue(async () => {
      await this.writer.rawWrite(char, data);
    });
    this.onSnapshot?.({ timerRemainingSec: sec });
  }

  async writeShutdownDelay(sec: number): Promise<void> {
    const char = this.chars.get(CHARS.SHUTDOWN_DELAY)!;
    const clamped = sec < 10 && sec > 0 ? 10 : sec;
    const data = new Uint8Array([(clamped >> 8) & 0xff, clamped & 0xff]);
    await this.writer.enqueue(async () => {
      await this.writer.rawWrite(char, data);
    });
    this.onSnapshot?.({ shutdownDelaySec: clamped });
  }

  async writeGearDownMode(mode: 0 | 1): Promise<void> {
    const char = this.chars.get(CHARS.GEAR_DOWN_MODE)!;
    await this.writer.enqueue(async () => {
      await this.writer.rawWrite(char, new Uint8Array([mode]));
    });
    this.onSnapshot?.({ gearDownMode: mode });
  }

  async writeSpeedCalib(speeds: [number, number, number, number]): Promise<void> {
    const char = this.chars.get(CHARS.SPEED_CALIB)!;
    await this.writer.enqueue(async () => {
      await this.writer.rawWrite(char, new Uint8Array(speeds));
    });
    this.onSnapshot?.({ speedCalib: speeds });
  }

  async writeNatureCurve(points: number[]): Promise<void> {
    const char = this.chars.get(CHARS.NATURE_CURVE)!;
    if (points.length !== 128) throw new Error('自然风曲线必须 128 点');
    await this.writer.enqueue(async () => {
      await this.writer.rawWrite(char, new Uint8Array(points));
    });
  }

  async writeBatteryCapacity(mah: number, v: number): Promise<void> {
    const char = this.chars.get(CHARS.BATTERY_INFO)!;
    const mwh = Math.round(mah * v);
    await this.writer.enqueue(async () => {
      await this.writer.rawWrite(char, encodeCmd(cmd.setBatteryCapacity(mwh)));
    });
  }

  async writePowCOut(enable: boolean): Promise<void> {
    const char = this.chars.get(CHARS.POWER_STATUS)!;
    await this.writer.enqueue(async () => {
      await this.writer.rawWrite(char, encodeCmd(cmd.setPowCOut(enable)));
    });
  }

  async writePowCIn(enable: boolean): Promise<void> {
    const char = this.chars.get(CHARS.POWER_STATUS)!;
    await this.writer.enqueue(async () => {
      await this.writer.rawWrite(char, encodeCmd(cmd.setPowCIn(enable)));
    });
  }

  async writePowSwitch(reg: PowReg, bit: number, enable: boolean, inverted: boolean): Promise<void> {
    // inverted=true 表示 0=使能（多数位），enable=true 表示用户想"使能"
    // writeRegisterBit 的 value 参数表示"将位设为 1"
    // 所以：inverted 时，使能=把位清 0；非 inverted 时，使能=把位置 1
    const value = inverted ? !enable : enable;
    await this.writer.writeRegisterBit(reg, bit, value);
  }

  async writePowRegister(reg: PowReg, byte: number): Promise<void> {
    const char = this.chars.get(CHARS.POWER_CONFIG)!;
    await this.writer.enqueue(async () => {
      await this.writer.rawWrite(char, encodeCmd(cmd.setRegister(reg, byte)));
    });
  }

  disconnect(): void {
    this.device?.gatt?.disconnect();
  }

  private cleanup(): void {
    this.stopPolling();
    this.chars.clear();
    this.device = null;
    this.profile = null;
    this.writer = new WriteQueue();
    this.onState?.('idle');
  }
}
