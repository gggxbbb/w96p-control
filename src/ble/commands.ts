export type PowReg = '1A' | '1C' | '1D' | '1E' | '2A' | '2B' | '2C';

export const cmd = {
  setBatteryCapacity: (mwh: number) => `BAT_CAP=${mwh},`,
  setPowCOut: (enable: boolean) => `POW_C_OUT=${enable ? 0 : 1},`,
  setPowCIn: (enable: boolean) => `POW_C_IN=${enable ? 0 : 1},`,
  setRegister: (reg: PowReg, byte: number) => `POW_${reg}=${byte},`,
};

export const encodeCmd = (str: string): Uint8Array =>
  new TextEncoder().encode(str);
