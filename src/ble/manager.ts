import { SERVICES, CHARS, ALL_OPTIONAL_SERVICES } from './uuids';
import { pickProfile, type Profile } from './profiles';
import {
  parseBatteryInfo, parsePowerStatus, parseMotorInfo, parsePowerConfig,
} from './parsers';
import { cmd, encodeCmd, type PowReg } from './commands';
import { WriteQueue } from './writer';
import type { IBleManager, BleState, BleSnapshot } from './types';
import { useDeviceStore } from '../stores/device';

export type { BleState, BleSnapshot } from './types';

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
const u8 = (dv: DataView, off = 0) => dv.byteLength > off ? dv.getUint8(off) : 0;
const u16be = (dv: DataView, off = 0) =>
  dv.byteLength >= off + 2 ? dv.getUint16(off, false) : 0;

export class BleManager implements IBleManager {
  private device: BluetoothDevice | null = null;
  private chars = new Map<string, BluetoothRemoteGATTCharacteristic>();
  private writer = new WriteQueue();
  private pollId: number | null = null;
  private lastWriteMs = 0;
  profile: Profile | null = null;

  onState?: (s: BleState, deviceName?: string, profile?: Profile) => void;
  onSnapshot?: (snap: BleSnapshot) => void;
  onError?: (msg: string) => void;

  async connect(): Promise<void> {
    this.onState?.('connecting');
    try {
      this.device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [SERVICES.MAIN] }],
        optionalServices: ALL_OPTIONAL_SERVICES,
      });
      this.device.addEventListener('gattserverdisconnected', () => this.cleanup());
      const gatt = this.device.gatt!;
      await gatt.connect();
      const main = await gatt.getPrimaryService(SERVICES.MAIN);
      const power = await gatt.getPrimaryService(SERVICES.POWER);
      const nature = await gatt.getPrimaryService(SERVICES.NATURE);
      for (const uuid of Object.values(CHARS)) {
        // DFU chars belong to FEE0 service, not handled here
        if (uuid.startsWith('0000fee')) continue;
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
    // Step 1: read 5 small characteristics in parallel (each ≤16 bytes, low fragment risk)
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
      return; // don't attempt curve if basic reads fail
    }
    // Step 2: read NATURE_CURVE separately (128B → ~7 GATT fragments) with retry
    await this.readCurveWithRetry();
  }

  /** Retry reading the 128-byte NATURE_CURVE characteristic (high fragment count, prone to GATT timeouts). */
  private async readCurveWithRetry(maxRetries = 2): Promise<void> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const v = await this.chars.get(CHARS.NATURE_CURVE)!.readValue();
        const dv = new DataView(v.buffer);
        const pts: number[] = [];
        for (let i = 0; i < dv.byteLength; i++) pts.push(u8(dv, i));
        this.onSnapshot?.({ natureCurve: pts });
        return;
      } catch (e) {
        if (attempt < maxRetries) {
          await sleep(500);
        } else {
          this.onError?.(String(e instanceof Error ? e.message : e));
        }
      }
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
    // Capture write timestamp now; if any write fires while we're in the queue,
    // skip onSnapshot to avoid overwriting optimistic updates with stale reads.
    const writeTsBefore = this.lastWriteMs;
    this.writer.enqueue(async () => {
      // Sequential reads avoid overwhelming BLE stack
      const speed = await this.chars.get(CHARS.FAN_SPEED)!.readValue();
      const bat = await this.chars.get(CHARS.BATTERY_INFO)!.readValue();
      const pwr = await this.chars.get(CHARS.POWER_STATUS)!.readValue();
      const mot = await this.chars.get(CHARS.MOTOR_INFO)!.readValue();
      const nw = await this.chars.get(CHARS.NATURE_WIND)!.readValue();
      const gdm = await this.chars.get(CHARS.GEAR_DOWN_MODE)!.readValue();
      const pc = await this.chars.get(CHARS.POWER_CONFIG)!.readValue();
      const timer = await this.chars.get(CHARS.TIMER)!.readValue();
      const speedDv = new DataView(speed.buffer);
      const batDv = new DataView(bat.buffer);
      const pwrDv = new DataView(pwr.buffer);
      const motDv = new DataView(mot.buffer);
      const nwDv = new DataView(nw.buffer);
      const gdmDv = new DataView(gdm.buffer);
      const pcDv = new DataView(pc.buffer);
      const timerDv = new DataView(timer.buffer);
      const natureOn = u8(nwDv) === 1;
      this.writer.setNatureWindOn(natureOn);
      // Skip snapshot if a write was enqueued after poll started — those
      // reads are stale and would overwrite optimistic UI updates.
      if (this.lastWriteMs <= writeTsBefore) {
        this.onSnapshot?.({
          fanSpeed: u8(speedDv),
          battery: parseBatteryInfo(batDv),
          powerStatus: parsePowerStatus(pwrDv),
          motor: parseMotorInfo(motDv, this.profile!),
          powerConfig: parsePowerConfig(pcDv),
          natureWindOn: natureOn,
          gearDownMode: u8(gdmDv) as 0 | 1,
          timerRemainingSec: u16be(timerDv),
        });
      }
    }).catch(e => {
      this.onError?.(String(e instanceof Error ? e.message : e));
    });
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
    this.lastWriteMs = Date.now();
    const prevNw = useDeviceStore.getState().natureWindOn;
    const prevSpeed = useDeviceStore.getState().fanSpeed;
    // Predict target speed from calibration: gear 0=off, gear N=speedCalib[N-1]
    const calib = useDeviceStore.getState().speedCalib;
    const targetSpeed = gear === 0 ? 0 : calib[gear - 1];
    this.onSnapshot?.({ fanSpeed: targetSpeed, natureWindOn: false });
    try {
      const char = this.chars.get(CHARS.POWER)!;
      await this.writer.enqueue(async () => {
        if (this.writer.isNatureWindOn() && this.writer.natureChar && gear !== 0) {
          await this.writer.rawWrite(this.writer.natureChar, new Uint8Array([0]));
          await sleep(100);
          this.writer.setNatureWindOn(false);
        }
        await this.writer.rawWrite(char, new Uint8Array([gear]));
      });
    } catch {
      this.onSnapshot?.({ fanSpeed: prevSpeed, natureWindOn: prevNw });
    }
  }

  async writeFanSpeed(pct: number): Promise<void> {
    this.lastWriteMs = Date.now();
    const prevSpeed = useDeviceStore.getState().fanSpeed;
    const prevNw = useDeviceStore.getState().natureWindOn;
    this.onSnapshot?.({ fanSpeed: pct, natureWindOn: false });
    try {
      const char = this.chars.get(CHARS.FAN_SPEED)!;
      await this.writer.writeFanSpeed(char, pct);
    } catch {
      this.onSnapshot?.({ fanSpeed: prevSpeed, natureWindOn: prevNw });
    }
  }

  async writeNatureWind(on: boolean): Promise<void> {
    this.lastWriteMs = Date.now();
    const prevNw = useDeviceStore.getState().natureWindOn;
    this.writer.setNatureWindOn(on);
    this.onSnapshot?.({ natureWindOn: on });
    try {
      const char = this.chars.get(CHARS.NATURE_WIND)!;
      await this.writer.enqueue(async () => {
        await this.writer.rawWrite(char, new Uint8Array([on ? 1 : 0]));
      });
    } catch {
      this.writer.setNatureWindOn(prevNw);
      this.onSnapshot?.({ natureWindOn: prevNw });
    }
  }

  async writeTimer(minutes: number): Promise<void> {
    this.lastWriteMs = Date.now();
    const prev = useDeviceStore.getState().timerRemainingSec;
    const sec = minutes * 60;
    this.onSnapshot?.({ timerRemainingSec: sec });
    try {
      const char = this.chars.get(CHARS.TIMER)!;
      const data = new Uint8Array([(sec >> 8) & 0xff, sec & 0xff]);
      await this.writer.enqueue(async () => {
        await this.writer.rawWrite(char, data);
      });
    } catch {
      this.onSnapshot?.({ timerRemainingSec: prev });
    }
  }

  async writeShutdownDelay(sec: number): Promise<void> {
    this.lastWriteMs = Date.now();
    const prev = useDeviceStore.getState().shutdownDelaySec;
    const clamped = sec < 10 && sec > 0 ? 10 : sec;
    this.onSnapshot?.({ shutdownDelaySec: clamped });
    try {
      const char = this.chars.get(CHARS.SHUTDOWN_DELAY)!;
      const data = new Uint8Array([(clamped >> 8) & 0xff, clamped & 0xff]);
      await this.writer.enqueue(async () => {
        await this.writer.rawWrite(char, data);
      });
    } catch {
      this.onSnapshot?.({ shutdownDelaySec: prev });
    }
  }

  async writeGearDownMode(mode: 0 | 1): Promise<void> {
    this.lastWriteMs = Date.now();
    const prev = useDeviceStore.getState().gearDownMode;
    this.onSnapshot?.({ gearDownMode: mode });
    try {
      const char = this.chars.get(CHARS.GEAR_DOWN_MODE)!;
      await this.writer.enqueue(async () => {
        await this.writer.rawWrite(char, new Uint8Array([mode]));
      });
    } catch {
      this.onSnapshot?.({ gearDownMode: prev });
    }
  }

  async writeSpeedCalib(speeds: [number, number, number, number]): Promise<void> {
    this.lastWriteMs = Date.now();
    const prev = useDeviceStore.getState().speedCalib;
    this.onSnapshot?.({ speedCalib: speeds });
    try {
      const char = this.chars.get(CHARS.SPEED_CALIB)!;
      await this.writer.enqueue(async () => {
        await this.writer.rawWrite(char, new Uint8Array(speeds));
      });
    } catch {
      this.onSnapshot?.({ speedCalib: prev });
    }
  }

  async writeNatureCurve(points: number[]): Promise<void> {
    this.lastWriteMs = Date.now();
    if (points.length !== 128) throw new Error('自然风曲线必须 128 点');
    const prev = useDeviceStore.getState().natureCurve;
    this.onSnapshot?.({ natureCurve: points });
    try {
      const char = this.chars.get(CHARS.NATURE_CURVE)!;
      await this.writer.enqueue(async () => {
        await this.writer.rawWrite(char, new Uint8Array(points));
      });
    } catch {
      this.onSnapshot?.({ natureCurve: prev });
    }
  }

  async writeBatteryCapacity(mah: number, v: number): Promise<void> {
    this.lastWriteMs = Date.now();
    const mwh = Math.round(mah * v);
    const prev = useDeviceStore.getState().battery?.capacityMwh;
    this.onSnapshot?.({ battery: { capacityMwh: mwh } as any });
    try {
      const char = this.chars.get(CHARS.BATTERY_INFO)!;
      await this.writer.enqueue(async () => {
        await this.writer.rawWrite(char, encodeCmd(cmd.setBatteryCapacity(mwh)));
      });
    } catch {
      if (prev !== undefined) this.onSnapshot?.({ battery: { capacityMwh: prev } } as any);
    }
  }

  async writePowCOut(enable: boolean): Promise<void> {
    this.lastWriteMs = Date.now();
    const prev = useDeviceStore.getState().powerStatus?.powCOut;
    this.onSnapshot?.({ powerStatus: { powCOut: enable } } as any);
    try {
      const char = this.chars.get(CHARS.POWER_STATUS)!;
      await this.writer.enqueue(async () => {
        await this.writer.rawWrite(char, encodeCmd(cmd.setPowCOut(enable)));
      });
    } catch {
      if (prev !== undefined) this.onSnapshot?.({ powerStatus: { powCOut: prev } } as any);
    }
  }

  async writePowCIn(enable: boolean): Promise<void> {
    this.lastWriteMs = Date.now();
    const prev = useDeviceStore.getState().powerStatus?.powCIn;
    this.onSnapshot?.({ powerStatus: { powCIn: enable } } as any);
    try {
      const char = this.chars.get(CHARS.POWER_STATUS)!;
      await this.writer.enqueue(async () => {
        await this.writer.rawWrite(char, encodeCmd(cmd.setPowCIn(enable)));
      });
    } catch {
      if (prev !== undefined) this.onSnapshot?.({ powerStatus: { powCIn: prev } } as any);
    }
  }

  async writePowSwitch(reg: PowReg, bit: number, enable: boolean, inverted: boolean): Promise<void> {
    this.lastWriteMs = Date.now();
    const value = inverted ? !enable : enable;
    const regKey = ('pow' + reg) as keyof import('./parsers').PowerConfigRegs;
    const current = useDeviceStore.getState().powerConfig;
    const prevByte = current?.[regKey] as number | undefined;
    if (current && prevByte !== undefined) {
      const mask = 1 << bit;
      const next = value ? (prevByte | mask) : (prevByte & ~mask);
      if (next !== prevByte) {
        this.onSnapshot?.({ powerConfig: { [regKey]: next } } as any);
      }
    }
    try {
      await this.writer.writeRegisterBit(reg, bit, value);
    } catch {
      if (prevByte !== undefined) this.onSnapshot?.({ powerConfig: { [regKey]: prevByte } } as any);
    }
  }

  async writePowRegister(reg: PowReg, byte: number): Promise<void> {
    this.lastWriteMs = Date.now();
    const regKey = ('pow' + reg) as keyof import('./parsers').PowerConfigRegs;
    const prev = useDeviceStore.getState().powerConfig?.[regKey] as number | undefined;
    this.onSnapshot?.({ powerConfig: { [regKey]: byte } } as any);
    try {
      const char = this.chars.get(CHARS.POWER_CONFIG)!;
      await this.writer.enqueue(async () => {
        await this.writer.rawWrite(char, encodeCmd(cmd.setRegister(reg, byte)));
      });
    } catch {
      if (prev !== undefined) this.onSnapshot?.({ powerConfig: { [regKey]: prev } } as any);
    }
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
