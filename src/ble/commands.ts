export type PowReg = '1A' | '1C' | '1D' | '1E' | '2A' | '2B' | '2C';

export const cmd = {
  setBatteryCapacity: (mwh: number) => `BAT_CAP=${mwh},`,
  batClr: () => `BAT_CLR=0,`,
  setPowCOut: (enable: boolean) => `POW_C_OUT=${enable ? 0 : 1},`,
  setPowCIn: (enable: boolean) => `POW_C_IN=${enable ? 0 : 1},`,
  setPowCHi: (enable: boolean) => `POW_C_HI=${enable ? 0 : 1},`,
  powClr: () => `POW_CLR=0,`,
  setRegister: (reg: PowReg, byte: number) => `POW_${reg}=${byte},`,
  /** FFE4 自然风控制：1=保存当前配置，2=恢复默认 */
  natureWindCtrl: (op: 1 | 2) => new Uint8Array([op]),
  /** v1.3+ 蓝牙名称: BLE_NAME=xxx, */
  bleName: (name: string) => `BLE_NAME=${name},`,
  /** v1.7+ BLE 序列号显示开关: BLE_SN=1, / BLE_SN=0, */
  bleSn: (enabled: boolean) => `BLE_SN=${enabled ? 1 : 0},`,
} as const;

export const encodeCmd = (str: string): Uint8Array =>
  new TextEncoder().encode(str);
