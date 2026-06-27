import { describe, it, expect } from 'vitest';
import { cmd, encodeCmd } from './commands';

describe('commands', () => {
  it('setBatteryCapacity 构造正确 ASCII', () => {
    expect(cmd.setBatteryCapacity(18000)).toBe('BAT_CAP=18000,');
  });
  it('setPowCOut 使能时为 0（0=使能）', () => {
    expect(cmd.setPowCOut(true)).toBe('POW_C_OUT=0,');
    expect(cmd.setPowCOut(false)).toBe('POW_C_OUT=1,');
  });
  it('setPowCIn 使能时为 0', () => {
    expect(cmd.setPowCIn(true)).toBe('POW_C_IN=0,');
    expect(cmd.setPowCIn(false)).toBe('POW_C_IN=1,');
  });
  it('setRegister 构造 POW_xx 命令（值为十进制）', () => {
    expect(cmd.setRegister('1A', 0x1C)).toBe('POW_1A=28,');
    expect(cmd.setRegister('2C', 0x40)).toBe('POW_2C=64,');
    expect(cmd.setRegister('1E', 0)).toBe('POW_1E=0,');
  });
  it('encodeCmd 转 UTF-8 Uint8Array', () => {
    const bytes = encodeCmd('BAT_CAP=18000,');
    expect(Array.from(bytes)).toEqual([
      66, 65, 84, 95, 67, 65, 80, 61, 49, 56, 48, 48, 48, 44
    ]);
  });
});
