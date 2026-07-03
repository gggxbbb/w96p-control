import { SERVICES, CHARS, ALL_OPTIONAL_SERVICES, OPTIONAL_CHARS } from './uuids';
import { isCompatModel } from './profiles';
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
import { getFeatures } from './features';

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
  isCompatMode = false;

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

  onState?: (s: BleState, deviceName?: string, _isCompat?: boolean) => void;
  onSnapshot?: (snap: BleSnapshot) => void;
  onError?: (msg: string) => void;

  async connect(): Promise<void> {
    // 确保重连后调度器与写入队列已绑定（cleanup 可能已销毁旧 scheduler 并创建新 writer）
    this.scheduler = new GattScheduler('BLE');
    this.writer.bindScheduler(this.scheduler);

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

      // 硬件检测：通过 FFD3 字节长度判断兼容模式
      await this.detectCompatMode(power);

      // 发现所有特征（强制特征直接获取，可选特征 try/catch）
      for (const uuid of Object.values(CHARS)) {
        if (uuid.startsWith('0000fee')) continue; // DFU chars
        if (uuid.startsWith('0000ffc')) continue; // BLE_NAME service (handled separately)
        let svc = main;
        if (uuid.startsWith('0000ffd')) svc = power;
        else if (uuid.startsWith('0000ffe')) svc = nature;
        // 可选特征（旧固件不存在）—— try/catch 静默跳过
        if ((OPTIONAL_CHARS as readonly string[]).includes(uuid)) {
          try {
            this.chars.set(uuid, await svc.getCharacteristic(uuid));
          } catch {
            console.log('[BLE] 可选特征不可用:', uuid.slice(4, 8));
          }
          continue;
        }
        this.chars.set(uuid, await svc.getCharacteristic(uuid));
      }
      console.log('[BLE] 已获取', this.chars.size, '个特征');

      // 尝试连接 BLE 名称服务（FFC0, v1.3+）
      try {
        const bleNameSvc = await gatt.getPrimaryService(SERVICES.BLE_NAME);
        const bleNameChar = await bleNameSvc.getCharacteristic(CHARS.BLE_NAME);
        this.chars.set(CHARS.BLE_NAME, bleNameChar);
        console.log('[BLE] BLE 名称服务已就绪 (FFC0)');
      } catch {
        console.log('[BLE] BLE 名称服务不可用（FFC0）');
      }

      // 尝试连接 DFU 服务（FEE0），用于查询序列号和固件版本
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
      }

      this.writer.setNatureWindChar(this.chars.get(CHARS.NATURE_WIND)!);
      this.writer.setRegChar(this.chars.get(CHARS.POWER_CONFIG)!);
      this.onState?.('connected', this.device.name ?? '未知', this.isCompatMode);
      setTimeout(() => { void this.readInitial().then(() => setTimeout(() => void this.queryDeviceInfo(), 500)); }, 1500);
    } catch (e) {
      console.log('[BLE] 连接失败:', e);
      this.onState?.('error');
      this.onError?.(String(e instanceof Error ? e.message : e));
    }
  }

  /** 通过读取 FFD3 字节长度检测兼容模式 */
  private async detectCompatMode(powerSvc: BluetoothRemoteGATTService): Promise<void> {
    try {
      const motorChar = await powerSvc.getCharacteristic(CHARS.MOTOR_INFO);
      const dv = new DataView((await motorChar.readValue()).buffer);
      this.isCompatMode = isCompatModel(dv.byteLength);
      console.log('[BLE] 硬件检测: FFD3 length=' + dv.byteLength + ' → ' + (this.isCompatMode ? '兼容模式' : '完整模式'));
    } catch {
      console.log('[BLE] FFD3 硬件检测失败，默认兼容模式');
      this.isCompatMode = true;
    }
  }

  private async readInitial(): Promise<void> {
    try {
      await this.scheduler.enqueueRead(async () => {
        const timer = await this.timedRead(CHARS.TIMER);
        const calib = await this.timedRead(CHARS.SPEED_CALIB);
        const nw = await this.timedRead(CHARS.NATURE_WIND);
        const gdm = await this.timedRead(CHARS.GEAR_DOWN_MODE);
        const sd = await this.timedRead(CHARS.SHUTDOWN_DELAY);
        const nwSum = await this.timedRead(CHARS.NATURE_WIND_SUM);
        const nwTime = await this.timedRead(CHARS.NATURE_WIND_TIME);

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
          natureWindSum: u8(nwSum),
          natureWindTime: new DataView(nwTime.buffer).getUint32(0, false),
          isCompatMode: this.isCompatMode,
        });
        console.log('[BLE] 初始读取完成: timer=' + u16be(timerDv) + 's, calib=' + u8(calibDv, 0) + '/' + u8(calibDv, 1) + '/' + u8(calibDv, 2) + '/' + u8(calibDv, 3));
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

  /** 发送 DFU 命令并等待响应（写入走调度器，避免与轮询并发） */
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
      this.scheduler.enqueueWrite(async () => {
        await this.dfuWriteChar!.writeValueWithoutResponse(frame as BufferSource);
      }).catch((e) => {
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

        // v1.5+ Turbo 倒计时（可选特征）
        let turboCountdown = 0;
        if (this.chars.has(CHARS.TURBO_COUNTDOWN)) {
          try { turboCountdown = u16be(await this.timedRead(CHARS.TURBO_COUNTDOWN, 'poll')); } catch {}
        }

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
            motor: parseMotorInfo(motDv, this.isCompatMode),
            powerConfig: parsePowerConfig(pcDv),
            natureWindOn: natureOn,
            gearDownMode: u8(gdmDv) as 0 | 1,
            timerRemainingSec: u16be(timerDv),
            turboCountdownSec: turboCountdown,
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

  async readNatureWindSum(): Promise<number> {
    return this.scheduler.enqueueRead(async () => {
      const v = await this.timedRead(CHARS.NATURE_WIND_SUM);
      return u8(v);
    });
  }

  async readNatureWindTime(): Promise<number> {
    return this.scheduler.enqueueRead(async () => {
      const v = await this.timedRead(CHARS.NATURE_WIND_TIME);
      return new DataView(v.buffer).getUint32(0, false);
    });
  }

  async writeGear(gear: 0 | 1 | 2 | 3 | 4): Promise<void> {
    this.lastWriteMs = Date.now();
    const prevNw = useDeviceStore.getState().natureWindOn;
    const prevSpeed = useDeviceStore.getState().fanSpeed;
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

    const features = getFeatures(useDeviceStore.getState().firmwareVersion);
    if (features.has('autoBootOnSpeed') && prevSpeed === 0 && pct > 0) {
      try {
        console.log('[BLE] 未开机, 先手动开机');
        await this.writeGear(1);
      } catch {
        return;
      }
    }

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

  async writeTimer(sec: number): Promise<void> {
    this.lastWriteMs = Date.now();
    const prev = useDeviceStore.getState().timerRemainingSec;
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

  async writePowCHi(enable: boolean): Promise<void> {
    this.lastWriteMs = Date.now();
    const prev = useDeviceStore.getState().powerStatus?.powCHi;
    this.onSnapshot?.({ powerStatus: { powCHi: enable } } as any);
    try {
      const char = this.chars.get(CHARS.POWER_STATUS)!;
      await this.writer.enqueue(async () => {
        await this.writer.rawWrite(char, encodeCmd(cmd.setPowCHi(enable)));
      });
    } catch (e) {
      console.log('[BLE] writePowCHi 失败:', e);
      if (prev !== undefined) this.onSnapshot?.({ powerStatus: { powCHi: prev } } as any);
    }
  }

  async writeNatureWindCtrl(op: 1 | 2): Promise<void> {
    this.lastWriteMs = Date.now();
    try {
      const char = this.chars.get(CHARS.NATURE_WIND_CTRL)!;
      await this.writer.enqueue(async () => {
        await this.writer.rawWrite(char, cmd.natureWindCtrl(op));
      });
    } catch (e) {
      console.log('[BLE] writeNatureWindCtrl 失败:', e);
    }
  }

  async writeBatteryClr(): Promise<void> {
    this.lastWriteMs = Date.now();
    try {
      const char = this.chars.get(CHARS.BATTERY_INFO)!;
      await this.writer.enqueue(async () => {
        await this.writer.rawWrite(char, encodeCmd(cmd.batClr()));
      });
    } catch (e) {
      console.log('[BLE] writeBatteryClr 失败:', e);
    }
  }

  async writePowerClr(): Promise<void> {
    this.lastWriteMs = Date.now();
    try {
      const char = this.chars.get(CHARS.POWER_CONFIG)!;
      await this.writer.enqueue(async () => {
        await this.writer.rawWrite(char, encodeCmd(cmd.powClr()));
      });
    } catch (e) {
      console.log('[BLE] writePowerClr 失败:', e);
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

  // ===== v1.3+ 新功能 =====

  /** v1.3+ Turbo 模式开关 (FFF9, 0x01=开启, 0x00=退出) */
  async writeTurbo(on: boolean): Promise<void> {
    this.lastWriteMs = Date.now();
    const char = this.chars.get(CHARS.TURBO_MODE);
    if (!char) throw new Error('固件不支持 Turbo 模式');

    // 开机 workaround：风扇关机时开启 Turbo，先开机到 1 档
    if (on) {
      const features = getFeatures(useDeviceStore.getState().firmwareVersion);
      const prevSpeed = useDeviceStore.getState().fanSpeed;
      if (features.has('autoBootOnTurbo') && prevSpeed === 0) {
        try {
          console.log('[BLE] 未开机, 先手动开机（Turbo）');
          await this.writeGear(1);
        } catch {
          return;
        }
      }
    }

    try {
      await this.writer.enqueue(async () => {
        await this.writer.rawWrite(char, new Uint8Array([on ? 1 : 0]));
      });
    } catch (e) {
      console.log('[BLE] writeTurbo 失败:', e);
    }
  }

  /** v1.3+ Turbo 时间设置 (FFF8, v1.3=1字节1-199s, v1.4+=2字节1-600s) */
  async writeTurboTime(sec: number): Promise<void> {
    this.lastWriteMs = Date.now();
    const char = this.chars.get(CHARS.TURBO_TIME);
    if (!char) throw new Error('固件不支持 Turbo 时间设置');
    const features = getFeatures(useDeviceStore.getState().firmwareVersion);
    const max = features.has('turbo2Byte') ? 600 : 199;
    const clamped = Math.max(0, Math.min(max, sec));
    try {
      await this.writer.enqueue(async () => {
        if (features.has('turbo2Byte')) {
          // v1.4+: 2 bytes big-endian
          await this.writer.rawWrite(char, new Uint8Array([(clamped >> 8) & 0xff, clamped & 0xff]));
        } else {
          // v1.3: 1 byte
          await this.writer.rawWrite(char, new Uint8Array([clamped]));
        }
      });
    } catch (e) {
      console.log('[BLE] writeTurboTime 失败:', e);
    }
  }

  /** v1.3+ 临时关灯 (FFFA, 0x00=关灯) */
  async writeLightOff(): Promise<void> {
    this.lastWriteMs = Date.now();
    const char = this.chars.get(CHARS.LIGHT_OFF);
    if (!char) throw new Error('固件不支持关灯功能');
    try {
      await this.writer.enqueue(async () => {
        await this.writer.rawWrite(char, new Uint8Array([0]));
      });
    } catch (e) {
      console.log('[BLE] writeLightOff 失败:', e);
    }
  }

  /** v1.3+ 蓝牙名称修改 (FFC1, 字符串 "BLE_NAME=xxx,") */
  async writeBleName(name: string): Promise<void> {
    this.lastWriteMs = Date.now();
    const char = this.chars.get(CHARS.BLE_NAME);
    if (!char) throw new Error('固件不支持蓝牙名称修改');
    try {
      await this.writer.enqueue(async () => {
        await this.writer.rawWrite(char, encodeCmd(cmd.bleName(name)));
      });
    } catch (e) {
      console.log('[BLE] writeBleName 失败:', e);
    }
  }

  /** v1.4+ 读取 Turbo 剩余倒计时 (FFFB, 2字节 big-endian) */
  async readTurboCountdown(): Promise<number> {
    return this.scheduler.enqueueRead(async () => {
      const v = await this.timedRead(CHARS.TURBO_COUNTDOWN);
      return u16be(v);
    });
  }

  /** v1.4+ 读取 Turbo 当前状态 (FFF9, 0=未开启, 1=正在 Turbo) */
  async readTurbo(): Promise<number> {
    return this.scheduler.enqueueRead(async () => {
      const v = await this.timedRead(CHARS.TURBO_MODE);
      return u8(v);
    });
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
    this.isCompatMode = false;
    this.writer = new WriteQueue();
    this.dfuProtocol.reset();
    this.onState?.('idle');
  }
}
