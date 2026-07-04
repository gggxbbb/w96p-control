/**
 * BLE 命令构造器
 *
 * 所有写操作命令都通过字符串或 Uint8Array 编码后经 GATT 特征发送。
 */

/** 电源寄存器编号 */
export type PowReg = '1A' | '1C' | '1D' | '1E' | '2A' | '2B' | '2C';

/** 命令模板（字符串格式），通过 {@link encodeCmd} 转为 Uint8Array 后写入 GATT 特征 */
export const cmd = {
  /** 设置电池容量 (mWh) */
  setBatteryCapacity: (mwh: number) => `BAT_CAP=${mwh},`,
  /** 清除电池统计 */
  batClr: () => `BAT_CLR=0,`,
  /** 设置 Type-C 输出开关 */
  setPowCOut: (enable: boolean) => `POW_C_OUT=${enable ? 0 : 1},`,
  /** 设置 Type-C 输入开关 */
  setPowCIn: (enable: boolean) => `POW_C_IN=${enable ? 0 : 1},`,
  /** 设置 Type-C High 模式 */
  setPowCHi: (enable: boolean) => `POW_C_HI=${enable ? 0 : 1},`,
  /** 清除电源统计 */
  powClr: () => `POW_CLR=0,`,
  /** 写入电源寄存器值 */
  setRegister: (reg: PowReg, byte: number) => `POW_${reg}=${byte},`,
  /** FFE4 自然风控制：1=保存当前配置，2=恢复默认 */
  natureWindCtrl: (op: 1 | 2) => new Uint8Array([op]),
  /** v1.3+ 蓝牙名称修改 */
  bleName: (name: string) => `BLE_NAME=${name},`,
  /** v1.7+ BLE 序列号显示开关 (1=显示, 0=隐藏) */
  bleSn: (enabled: boolean) => `BLE_SN=${enabled ? 1 : 0},`,
} as const;

/** 将 ASCII 命令字符串编码为 Uint8Array 以便写入 GATT 特征 */
export const encodeCmd = (str: string): Uint8Array =>
  new TextEncoder().encode(str);
