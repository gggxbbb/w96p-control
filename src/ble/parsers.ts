import type { Profile } from './profiles';

export interface BatteryInfo {
  voltageMv: number;
  currentMa: number;
  capacityMwh: number;
  chgMwh: number;
  dchgMwh: number;
  rcapMwh: number;
  tempC: number;
  chgTimeS: number;
  dchgTimeS: number;
}
export interface PowerStatus {
  vbusVmV: number;
  vbusCurMa: number;
  vbusConnected: boolean;
  powC: number;
  powSta: number;
  powCOut: boolean;
  powCIn: boolean;
  powCHi: boolean;
}
export interface MotorInfo {
  currentMa: number;
  block: boolean;
  voltageMv: number;
}
export interface PowerConfigRegs {
  powLevel: number;
  powVer: number;
  powSink: number;
  powSrc: number;
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

export const parseMotorInfo = (dv: DataView, profile: Profile): MotorInfo => {
  const currentMa = readU16BE(dv, 0);
  if (!profile.parseMotorFull) {
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
