/**
 * 蓝牙协议数据解析
 *
 * 将 GATT 特征原始字节解析为结构化数据。
 * 所有字段均为大端序（Big Endian），与设备固件协议一致。
 */

/** 电池信息（FFD1 特征） */
export interface BatteryInfo {
  /** 电压 (mV) */
  voltageMv: number;
  /** 电流 (mA)，正值=充电，负值=放电 */
  currentMa: number;
  /** 标称容量 (mWh) */
  capacityMwh: number;
  /** 累计充电量 (mWh) */
  chgMwh: number;
  /** 累计放电量 (mWh) */
  dchgMwh: number;
  /** 剩余容量 (mWh) */
  rcapMwh: number;
  /** 电池温度 (℃) */
  tempC: number;
  /** 累计充电时间 (秒) */
  chgTimeS: number;
  /** 累计放电时间 (秒) */
  dchgTimeS: number;
}

/** 电源状态（FFD2 特征） */
export interface PowerStatus {
  /** VBUS 电压 (mV) */
  vbusVmV: number;
  /** VBUS 电流 (mA) */
  vbusCurMa: number;
  /** VBUS 是否连接 */
  vbusConnected: boolean;
  /** 电源类型：0=无, 1=C口输入, 2=C口输出 */
  powC: number;
  /** 电源状态：0=停止, 1=充电, 2=放电 */
  powSta: number;
  /** C 口输出使能 */
  powCOut: boolean;
  /** C 口输入使能 */
  powCIn: boolean;
  /** C 口高压使能 */
  powCHi: boolean;
}

/** 电机信息（FFD3 特征） */
export interface MotorInfo {
  /** 电机电流 (mA) */
  currentMa: number;
  /** 是否堵转 */
  block: boolean;
  /** 电机电压 (mV)，兼容模式 (W66D) 下为 0 */
  voltageMv: number;
}

/** 电源配置寄存器（FFD4 特征） */
export interface PowerConfigRegs {
  /** 电源等级 */
  powLevel: number;
  /** 电源固件版本 */
  powVer: number;
  /** Sink 能力 */
  powSink: number;
  /** Source 能力 */
  powSrc: number;
  /** 核心温度 */
  powCoreTemp: number;
  pow1A: number;
  pow1C: number;
  pow1D: number;
  pow1E: number;
  pow2A: number;
  pow2B: number;
  pow2C: number;
}

const readU16BE = (dv: DataView, off: number): number =>
  dv.byteLength >= off + 2 ? dv.getUint16(off, false) : 0;
const readI16BE = (dv: DataView, off: number): number =>
  dv.byteLength >= off + 2 ? dv.getInt16(off, false) : 0;
const readU32BE = (dv: DataView, off: number): number =>
  dv.byteLength >= off + 4 ? dv.getUint32(off, false) : 0;

/** 解析电池信息 (FFD1) */
export const parseBatteryInfo = (dv: DataView): BatteryInfo => ({
  voltageMv: readU16BE(dv, 0),
  currentMa: readI16BE(dv, 2),
  capacityMwh: readU32BE(dv, 4),
  chgMwh: readU32BE(dv, 8),
  dchgMwh: readU32BE(dv, 12),
  rcapMwh: readU32BE(dv, 16),
  tempC: readI16BE(dv, 20),
  chgTimeS: readU32BE(dv, 22),
  dchgTimeS: readU32BE(dv, 26),
});

/** 解析电源状态 (FFD2) */
export const parsePowerStatus = (dv: DataView): PowerStatus => {
  const rawCur = readI16BE(dv, 4);
  const disconnected = rawCur === 32767; // 0x7FFF 哨兵 = VBUS 未接入
  return {
    vbusVmV: readU32BE(dv, 0),
    vbusCurMa: disconnected ? 0 : rawCur,
    vbusConnected: !disconnected,
    powC: dv.byteLength > 6 ? dv.getUint8(6) : 0,
    powSta: dv.byteLength > 7 ? dv.getUint8(7) : 0,
    powCOut: dv.byteLength > 8 ? dv.getUint8(8) === 0 : false,  // 0=使能
    powCIn: dv.byteLength > 9 ? dv.getUint8(9) === 0 : false,
    powCHi: dv.byteLength > 10 ? dv.getUint8(10) === 0 : false,  // 0=使能
  };
};

/**
 * 解析电机信息 (FFD3)
 * @param dv - FFD3 特征值的 DataView
 * @param isCompat - 兼容模式 (W66D) 下无电机电压字段
 */
export const parseMotorInfo = (dv: DataView, isCompat = false): MotorInfo => {
  const currentMa = readU16BE(dv, 0);
  if (isCompat) {
    return { currentMa, block: false, voltageMv: 0 };
  }
  const rawBlock = dv.byteLength > 2 ? dv.getUint8(2) : 0;
  const block = (rawBlock & 0xf7) === 1;
  const voltageMv = dv.byteLength >= 2 ? readU16BE(dv, dv.byteLength - 2) : 0;
  return {
    currentMa,
    block,
    voltageMv: voltageMv > 20000 ? 0 : voltageMv,
  };
};

/** 解析电源配置寄存器 (FFD4) */
export const parsePowerConfig = (dv: DataView): PowerConfigRegs => ({
  powLevel: dv.byteLength > 0 ? dv.getUint8(0) : 0,
  powVer: dv.byteLength > 1 ? dv.getUint8(1) : 0,
  powSink: dv.byteLength > 2 ? dv.getUint8(2) : 0,
  powSrc: dv.byteLength > 3 ? dv.getUint8(3) : 0,
  powCoreTemp: dv.byteLength >= 6 ? readI16BE(dv, 4) : 0,
  pow1A: dv.byteLength > 6 ? dv.getUint8(6) : 0,
  pow1C: dv.byteLength > 7 ? dv.getUint8(7) : 0,
  pow1D: dv.byteLength > 8 ? dv.getUint8(8) : 0,
  pow1E: dv.byteLength > 9 ? dv.getUint8(9) : 0,
  pow2A: dv.byteLength > 13 ? dv.getUint8(13) : 0,
  pow2B: dv.byteLength > 14 ? dv.getUint8(14) : 0,
  pow2C: dv.byteLength > 15 ? dv.getUint8(15) : 0,
});
