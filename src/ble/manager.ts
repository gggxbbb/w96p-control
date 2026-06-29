import { SERVICES, CHARS, ALL_OPTIONAL_SERVICES } from './uuids';
import { pickProfile, type Profile } from './profiles';
import {
  parseBatteryInfo, parsePowerStatus, parseMotorInfo, parsePowerConfig,
} from './parsers';
import { cmd, encodeCmd, type PowReg } from './commands';
import { WriteQueue } from './writer';
import { GattScheduler } from './scheduler';
import type { IBleManager, BleState, BleSnapshot } from './types';
import { useDeviceStore } from '../stores/device';
import { useBleMetrics, type OpRecord } from '../stores/bleMetrics';
import { BlePackageProtocol } from '../dfu/packageProtocol';
import { buildControlPayload, parseVersion, parseSnLittleEndian, CTRL_GET_VERSION, CTRL_GET_SN } from '../dfu/dfuProtocol';

export type { BleState, BleSnapshot } from './types';

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
const u8 = (dv: DataView, off = 0) => dv.byteLength > off ? dv.getUint8(off) : 0;
const u16be = (dv: DataView, off = 0) =>
  dv.byteLength >= off + 2 ? dv.getUint16(off, false) : 0;

export class BleManager implements IBleManager {
  private device: BluetoothDevice | null = null;
  private chars = new Map<string, BluetoothRemoteGATTCharacteristic>();
  private scheduler = new GattScheduler('BLE');
  private writer = new WriteQueue();
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private pollActive = false;
  private pollIntervalMs = 1000;
  private lastWriteMs = 0;
  profile: Profile | null = null;

  /** 计时的 GATT 读取（记录 metrics） */
  private async timedRead(uuid: string, opType: OpRecord['type'] = 'read'): Promise<DataView> {
    const t0 = performance.now();
    const charId = uuid.slice(4, 8);
    try {
      const v = await this.chars.get(uuid)!.readValue();
      useBleMetrics.getState().recordOp({
        ts: t0, type: opType, charId, size: v.byteLength,
        duration: Math.round(performance.now() - t0),
      });
      return new DataView(v.buffer);
    } catch (e) {
      useBleMetrics.getState().recordOp({
        ts: t0, type: opType, charId, size: 0,
        duration: Math.round(performance.now() - t0),
        error: String(e instanceof Error ? e.message : e),
      });
      throw e;
    }
  }

  constructor() {
    this.writer.bindScheduler(this.scheduler);
  }

  // DFU query fields
  private dfuProtocol = new BlePackageProtocol(true);
  private dfuWriteChar: BluetoothRemoteGATTCharacteristic | null = null;
  private dfuNotifyChar: BluetoothRemoteGATTCharacteristic | null = null;
  private dfuPendingResolve: ((data: Uint8Array) => void) | null = null;
  private dfuNotifyCleanup: (() => void) | null = null;

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
      this.device.addEventListener('gattserverdisconnected', () => {
        console.log('[BLE] GATT 服务器断开连接');
        this.cleanup();
      });
      const gatt = this.device.gatt!;
      await gatt.connect();
      console.log('[BLE] GATT 已连接, 设备:', this.device.name);
      const main = await gatt.getPrimaryService(SERVICES.MAIN);
      const power = await gatt.getPrimaryService(SERVICES.POWER);
      const nature = await gatt.getPrimaryService(SERVICES.NATURE);
      console.log('[BLE] 已获取 3 个主服务 (FFF0/FFD0/FFE0)');
      for (const uuid of Object.values(CHARS)) {
        // DFU chars belong to FEE0 service, not handled here
        if (uuid.startsWith('0000fee')) continue;
        let svc = main;
        if (uuid.startsWith('0000ffd')) svc = power;
        else if (uuid.startsWith('0000ffe')) svc = nature;
        this.chars.set(uuid, await svc.getCharacteristic(uuid));
      }
      console.log('[BLE] 已获取', this.chars.size, '个特征');
      // 尝试连接 DFU 服务（FEE0），用于查询序列号和固件版本
      // 使用 getPrimaryServices 避免找不到服务时抛 GATT 异常
      try {
        const dfuServices = await gatt.getPrimaryServices(SERVICES.DFU);
        if (dfuServices.length > 0) {
          const dfuSvc = dfuServices[0]!;
          this.dfuWriteChar = await dfuSvc.getCharacteristic(CHARS.DFU_WRITE);
          this.dfuNotifyChar = await dfuSvc.getCharacteristic(CHARS.DFU_NOTIFY);
          await this.dfuNotifyChar.startNotifications();
          console.log('[BLE] DFU 服务已就绪 (FEE0)');
          const onDfuNotify = (event: Event) => {
            const target = event.target as BluetoothRemoteGATTCharacteristic;
            const value = target.value;
            if (!value) return;
            const raw = new Uint8Array(value.buffer, 0, value.byteLength);
            const payloads = this.dfuProtocol.onReceive(raw);
            for (const payload of payloads) {
              console.log('[BLE] DFU Notify payload:', Array.from(payload).map(b => b.toString(16).padStart(2, '0')).join(' '));
              if (this.dfuPendingResolve) {
                const resolve = this.dfuPendingResolve;
                this.dfuPendingResolve = null;
                resolve(payload);
              }
            }
          };
          this.dfuNotifyChar.addEventListener('characteristicvaluechanged', onDfuNotify);
          this.dfuNotifyCleanup = () => {
            this.dfuNotifyChar?.removeEventListener('characteristicvaluechanged', onDfuNotify);
          };
        }
      } catch {
        console.log('[BLE] DFU 服务不可用（FEE0），将无法查询序列号/固件版本');
        // 静默忽略，DFU 服务不可用不影响主控功能
      }
      this.profile = pickProfile(this.device.name ?? undefined);
      this.writer.setNatureWindChar(this.chars.get(CHARS.NATURE_WIND)!);
      this.writer.setRegChar(this.chars.get(CHARS.POWER_CONFIG)!);
      this.onState?.('connected', this.device.name ?? '未知', this.profile);
      setTimeout(() => { void this.readInitial().then(() => setTimeout(() => void this.queryDeviceInfo(), 500)); }, 1500);
    } catch (e) {
      console.log('[BLE] 连接失败:', e);
      this.onState?.('error');
      this.onError?.(String(e instanceof Error ? e.message : e));
    }
  }

  private async readInitial(): Promise<void> {
    if (!this.profile) return;

    try {
      await this.scheduler.enqueueRead(async () => {
        const timer = await this.timedRead(CHARS.TIMER);
        const calib = await this.timedRead(CHARS.SPEED_CALIB);
        const nw = await this.timedRead(CHARS.NATURE_WIND);
        const gdm = await this.timedRead(CHARS.GEAR_DOWN_MODE);
        const sd = await this.timedRead(CHARS.SHUTDOWN_DELAY);

        const timerDv = timer;
        const calibDv = calib;
        const nwDv = nw;
        const gdmDv = gdm;
        const sdDv = sd;
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
        console.log('[BLE] 初始读取完成: timer=' + u16be(timerDv) + 's, fan=' + u8(calibDv, 0) + '/' + u8(calibDv, 1) + '/' + u8(calibDv, 2) + '/' + u8(calibDv, 3) + ', nw=' + u8(nwDv) + ', gdm=' + u8(gdmDv));
      });
    } catch (e) {
      console.log('[BLE] 初始读取失败:', e);
      this.onError?.(String(e instanceof Error ? e.message : e));
      return;
    }
    // Step 2: read NATURE_CURVE separately (128B → ~7 GATT fragments) with retry
    await this.readCurveWithRetry();
  }

  /** Retry reading the 128-byte NATURE_CURVE characteristic (high fragment count, prone to GATT timeouts). */
  private async readCurveWithRetry(maxRetries = 2): Promise<void> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        await this.scheduler.enqueueRead(async () => {
          const v = await this.timedRead(CHARS.NATURE_CURVE);
          const dv = v;
          const pts: number[] = [];
          for (let i = 0; i < dv.byteLength; i++) pts.push(u8(dv, i));
          this.onSnapshot?.({ natureCurve: pts });
          console.log('[BLE] 自然风曲线读取完成, ' + pts.length + ' 点');
        });
        return;
      } catch (e) {
        if (attempt < maxRetries) {
          await sleep(500);
        } else {
          console.log('[BLE] 自然风曲线读取失败（已重试）:', e);
          this.onError?.(String(e instanceof Error ? e.message : e));
        }
      }
    }
  }

  /** 通过 DFU 服务查询设备序列号和固件版本 */
  private async queryDeviceInfo(): Promise<void> {
    if (!this.dfuWriteChar) return;

    // 查询固件版本
    try {
      const verPayload = await this.sendDfu(buildControlPayload(CTRL_GET_VERSION, true));
      const ver = parseVersion(verPayload);
      if (ver !== 'unknown') {
        console.log('[BLE] 固件版本: ' + ver);
        this.onSnapshot?.({ firmwareVersion: ver });
      } else {
        console.log('[BLE] GET_VERSION 解析失败, raw:', Array.from(verPayload).map(b => b.toString(16)).join(' '));
      }
    } catch (e) {
      console.log('[BLE] GET_VERSION 查询失败:', e);
    }

    // 查询序列号
    try {
      const snPayload = await this.sendDfu(buildControlPayload(CTRL_GET_SN, true));
      const sn = parseSnLittleEndian(snPayload);
      if (sn >= 0) {
        console.log('[BLE] 序列号: ' + sn);
        this.onSnapshot?.({ serialNumber: String(sn) });
      } else {
        console.log('[BLE] GET_SN 解析失败, raw:', Array.from(snPayload).map(b => b.toString(16)).join(' '));
      }
    } catch (e) {
      console.log('[BLE] GET_SN 查询失败:', e);
    }
  }

  /** 发送 DFU 命令并等待响应 */
  private sendDfu(payload: Uint8Array, timeoutMs = 3000): Promise<Uint8Array> {
    return new Promise<Uint8Array>((resolve, reject) => {
      if (!this.dfuWriteChar) {
        reject(new Error('DFU not available'));
        return;
      }

      const timeout = setTimeout(() => {
        this.dfuPendingResolve = null;
        const err = new Error(`DFU query timeout after ${timeoutMs}ms`);
        console.log('[BLE] DFU 查询超时:', err.message);
        reject(err);
      }, timeoutMs);

      this.dfuPendingResolve = (data: Uint8Array) => {
        clearTimeout(timeout);
        resolve(data);
      };

      const frame = this.dfuProtocol.pack(payload);
      console.log('[BLE] DFU 发送命令:', Array.from(payload).map(b => b.toString(16).padStart(2, '0')).join(' '));
      this.dfuWriteChar!.writeValueWithoutResponse(frame as BufferSource).catch((e) => {
        clearTimeout(timeout);
        this.dfuPendingResolve = null;
        console.log('[BLE] DFU 写入失败:', e);
        reject(e);
      });
    });
  }

  startPolling(intervalMs: number): void {
    this.stopPolling();
    this.pollActive = true;
    this.pollIntervalMs = intervalMs;
    console.log('[BLE] 开始轮询, 间隔 ' + intervalMs + 'ms');
    this.scheduleNextPoll();
  }
  stopPolling(): void {
    this.pollActive = false;
    if (this.pollTimer !== null) {
      console.log('[BLE] 停止轮询');
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private scheduleNextPoll(): void {
    if (!this.pollActive) return;
    this.pollTimer = setTimeout(() => {
      this.pollTimer = null;
      void this.pollOnce();
    }, this.pollIntervalMs);
  }

  private async pollOnce(): Promise<void> {
    if (!this.profile) return;

    // Don't start a new poll cycle if the previous one hasn't been consumed yet
    if (this.scheduler.pendingPollReads > 0) return;

    const writeTsBefore = this.lastWriteMs;

    try {
      await this.scheduler.enqueuePoll(async () => {
        const speed = await this.timedRead(CHARS.FAN_SPEED, 'poll');
        const bat = await this.timedRead(CHARS.BATTERY_INFO, 'poll');
        const pwr = await this.timedRead(CHARS.POWER_STATUS, 'poll');
        const mot = await this.timedRead(CHARS.MOTOR_INFO, 'poll');
        const nw = await this.timedRead(CHARS.NATURE_WIND, 'poll');
        const gdm = await this.timedRead(CHARS.GEAR_DOWN_MODE, 'poll');
        const pc = await this.timedRead(CHARS.POWER_CONFIG, 'poll');
        const timer = await this.timedRead(CHARS.TIMER, 'poll');

        const speedDv = speed;
        const batDv = bat;
        const pwrDv = pwr;
        const motDv = mot;
        const nwDv = nw;
        const gdmDv = gdm;
        const pcDv = pc;
        const timerDv = timer;
        const natureOn = u8(nwDv) === 1;
        this.writer.setNatureWindOn(natureOn);

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
      });
    } catch (e) {
      console.log('[BLE] 轮询失败:', e);
      this.onError?.(String(e instanceof Error ? e.message : e));
    } finally {
      useBleMetrics.getState().recordSnapshot({
        ts: performance.now(),
        ...this.scheduler.getStats(),
      });
      if (this.pollActive) this.scheduleNextPoll();
    }
  }

  async readTimer(): Promise<number> {
    return this.scheduler.enqueueRead(async () => {
      const v = await this.timedRead(CHARS.TIMER);
      return u16be(v);
    });
  }

  async readNatureCurve(): Promise<number[]> {
    return this.scheduler.enqueueRead(async () => {
      const v = await this.timedRead(CHARS.NATURE_CURVE);
      const arr: number[] = [];
      for (let i = 0; i < v.byteLength; i++) arr.push(v.getUint8(i));
      return arr;
    });
  }

  async readBatteryCapacity(): Promise<number> {
    return this.scheduler.enqueueRead(async () => {
      const v = await this.timedRead(CHARS.BATTERY_INFO);
      return parseBatteryInfo(v).capacityMwh;
    });
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
    } catch (e) {
      console.log('[BLE] writeGear 失败:', e);
      this.onSnapshot?.({ fanSpeed: prevSpeed, natureWindOn: prevNw });
    }
  }

  async writeFanSpeed(pct: number): Promise<void> {
    this.lastWriteMs = Date.now();
    const prevSpeed = useDeviceStore.getState().fanSpeed;
    const prevNw = useDeviceStore.getState().natureWindOn;

    /* 风扇V1.2 固件已修复此问题
    // V3.4 行为：风扇关机时调转速，先自动开机到 1 档
    if (prevSpeed === 0 && pct > 0) {
      try {
        await this.writeGear(1);
      } catch {
        return; // writeGear 内部已回滚，放弃后续写入
      }
    }
    */

    this.onSnapshot?.({ fanSpeed: pct, natureWindOn: false });
    try {
      const char = this.chars.get(CHARS.FAN_SPEED)!;
      await this.writer.writeFanSpeed(char, pct);
    } catch (e) {
      console.log('[BLE] writeFanSpeed 失败:', e);
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
    } catch (e) {
      console.log('[BLE] writeNatureWind 失败:', e);
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
    } catch (e) {
      console.log('[BLE] writeTimer 失败:', e);
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
    } catch (e) {
      console.log('[BLE] writeShutdownDelay 失败:', e);
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
    } catch (e) {
      console.log('[BLE] writeGearDownMode 失败:', e);
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
    } catch (e) {
      console.log('[BLE] writeSpeedCalib 失败:', e);
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
    } catch (e) {
      console.log('[BLE] writeNatureCurve 失败:', e);
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
    } catch (e) {
      console.log('[BLE] writeBatteryCapacity 失败:', e);
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
    } catch (e) {
      console.log('[BLE] writePowCOut 失败:', e);
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
    } catch (e) {
      console.log('[BLE] writePowCIn 失败:', e);
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
    } catch (e) {
      console.log('[BLE] writePowSwitch 失败:', e);
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
    } catch (e) {
      console.log('[BLE] writePowRegister 失败:', e);
      if (prev !== undefined) this.onSnapshot?.({ powerConfig: { [regKey]: prev } } as any);
    }
  }

  disconnect(): void {
    this.scheduler.destroy();
    this.stopPolling();
    this.device?.gatt?.disconnect();
  }

  private cleanup(): void {
    this.stopPolling();
    this.scheduler.destroy();
    this.chars.clear();
    this.dfuNotifyCleanup?.();
    this.dfuNotifyCleanup = null;
    this.dfuWriteChar = null;
    this.dfuNotifyChar = null;
    this.dfuPendingResolve = null;
    this.device = null;
    this.profile = null;
    this.writer = new WriteQueue();
    this.dfuProtocol.reset();
    this.onState?.('idle');
  }
}
