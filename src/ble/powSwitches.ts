import type { PowReg } from './commands';

export interface PowSwitchDef {
  key: string;
  label: string;
  reg: PowReg;
  bit: number;
  inverted?: boolean;
  desc?: string;
}

// 开关位定义（inverted = 0 表示使能）
export const POW_SWITCHES: PowSwitchDef[] = [
  // POW_1C
  { key: 'fcp_src', label: 'FCP 输出', reg: '1C', bit: 0, inverted: true },
  { key: 'pd_sink', label: 'PD 输入', reg: '1C', bit: 4, inverted: true },
  { key: 'pd_src', label: 'PD 输出', reg: '1C', bit: 5, inverted: true },
  // POW_1D
  { key: 'sfcp_src', label: 'SFCP 输出', reg: '1D', bit: 0, inverted: true },
  { key: 'scp_sink', label: 'SCP 输入', reg: '1D', bit: 1, inverted: true },
  { key: 'scp_src', label: 'SCP 输出', reg: '1D', bit: 2, inverted: true },
  { key: 'afc_sink', label: 'AFC 输入', reg: '1D', bit: 3, inverted: true },
  { key: 'afc_src', label: 'AFC 输出', reg: '1D', bit: 4, inverted: true },
  { key: 'fcp_sink', label: 'FCP 输入', reg: '1D', bit: 7, inverted: true },
  // POW_1E
  { key: 'qc_src', label: 'QC 输出', reg: '1E', bit: 1, inverted: true },
  // POW_2B
  { key: 'pps1_en', label: 'PPS1 使能', reg: '2B', bit: 3, inverted: true },
  { key: 'pd_rebroadcast', label: 'PD 重新广播 5V/2A', reg: '2B', bit: 4, inverted: false },
  { key: 'pps0_en', label: 'PPS0 使能', reg: '2B', bit: 5, inverted: true },
];

export interface PowSegDef {
  key: string;
  label: string;
  reg: PowReg;
  bitOffset: number;
  bitWidth: number;
  options: { value: number; label: string }[];
  desc?: string;
}

// 非开关位（多选一位域）
export const POW_SEGS: PowSegDef[] = [
  // POW_1A
  {
    key: '1a_bit1', label: '输出最高电压', reg: '1A', bitOffset: 1, bitWidth: 1,
    options: [{ value: 0, label: '12V' }, { value: 1, label: '9V' }],
  },
  {
    key: '1a_bit2', label: '输入支持 12V', reg: '1A', bitOffset: 2, bitWidth: 1,
    options: [{ value: 0, label: '支持' }, { value: 1, label: '不支持' }],
  },
  {
    key: '1a_bit3', label: 'FCP 输出 12V', reg: '1A', bitOffset: 3, bitWidth: 1,
    options: [{ value: 0, label: '不支持' }, { value: 1, label: '支持' }],
  },
  {
    key: '1a_bit4', label: 'AFC 输出 12V', reg: '1A', bitOffset: 4, bitWidth: 1,
    options: [{ value: 0, label: '不支持' }, { value: 1, label: '支持' }],
  },
  // POW_2A
  {
    key: '2a_bit5', label: 'PPS1 最高电压', reg: '2A', bitOffset: 5, bitWidth: 1,
    options: [{ value: 0, label: '11V' }, { value: 1, label: '9V' }],
  },
  {
    key: '2a_bit6', label: 'PD 版本', reg: '2A', bitOffset: 6, bitWidth: 1,
    options: [{ value: 0, label: 'PD3.0' }, { value: 1, label: 'PD2.0' }],
  },
  // POW_2B
  {
    key: '2b_bit7', label: 'PD Fix 输出电压', reg: '2B', bitOffset: 7, bitWidth: 1,
    options: [{ value: 0, label: '12V' }, { value: 1, label: '9V' }],
  },
  // POW_2C PDO 电流
  {
    key: '2c_12v', label: '12V PDO 电流', reg: '2C', bitOffset: 0, bitWidth: 2,
    options: [
      { value: 0, label: '1.5A' }, { value: 1, label: '1.6A' },
      { value: 2, label: '1.7A' }, { value: 3, label: '1.75A' },
    ],
  },
  {
    key: '2c_9v', label: '9V PDO 电流', reg: '2C', bitOffset: 2, bitWidth: 2,
    options: [
      { value: 0, label: '2.0A' }, { value: 1, label: '2.2A' },
      { value: 2, label: '2.33A' }, { value: 3, label: '2.4A' },
    ],
  },
  {
    key: '2c_5v', label: '5V PDO 电流', reg: '2C', bitOffset: 4, bitWidth: 2,
    options: [
      { value: 0, label: '3.0A' }, { value: 1, label: '2.4A' },
      { value: 2, label: '2.5A' }, { value: 3, label: '2.0A' },
    ],
  },
];

// 按寄存器分组
export const REG_TITLES: Record<PowReg, string> = {
  '1A': 'POW_1A — 电压与协议支持',
  '1C': 'POW_1C — PD/FCP Source/Sink',
  '1D': 'POW_1D — AFC/FCP/SCP/SFCP',
  '1E': 'POW_1E — QC Source',
  '2A': 'POW_2A — PD 版本与 PPS1 电压',
  '2B': 'POW_2B — PD Fix/PPS/重新广播',
  '2C': 'POW_2C — PDO 电流',
};
