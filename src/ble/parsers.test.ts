import { describe, it, expect } from 'vitest';
import { parseBatteryInfo, parsePowerStatus, parseMotorInfo, parsePowerConfig } from './parsers';
import { PROFILES } from './profiles';

function dv(bytes: number[]): DataView {
  return new DataView(new Uint8Array(bytes).buffer);
}

describe('parseBatteryInfo', () => {
  it('解析 8 字节电池数据', () => {
    // 电压 3700mV (0x0E74), 电流 -500mA (0xFE0C 有符号), 容量 18000mWh (0x00004650)
    const result = parseBatteryInfo(dv([0x0E, 0x74, 0xFE, 0x0C, 0x00, 0x00, 0x46, 0x50]));
    expect(result.voltageMv).toBe(3700);
    expect(result.currentMa).toBe(-500);
    expect(result.capacityMwh).toBe(18000);
  });

  it('长度不足时降级返回零值', () => {
    const result = parseBatteryInfo(dv([0x0E, 0x74]));
    expect(result.voltageMv).toBe(3700);
    expect(result.currentMa).toBe(0);
    expect(result.capacityMwh).toBe(0);
  });
});

describe('parsePowerStatus', () => {
  it('解析 11 字节电源状态', () => {
    // VBUS 5000mV, 电流 1000mA, powC=1, powSta=1, powCOut=0(使能), powCIn=0(使能)
    const result = parsePowerStatus(dv([
      0x00, 0x00, 0x13, 0x88,  // VBUS 5000
      0x03, 0xE8,              // 电流 1000
      0x01, 0x01, 0x00, 0x00, 0x00
    ]));
    expect(result.vbusVmV).toBe(5000);
    expect(result.vbusCurMa).toBe(1000);
    expect(result.powC).toBe(1);
    expect(result.powSta).toBe(1);
    expect(result.powCOut).toBe(true);
    expect(result.powCIn).toBe(true);
  });
});

describe('parseMotorInfo', () => {
  it('W96P profile 解析完整（电流+堵转+电压）', () => {
    // 电流 320mA (0x0140), 堵转=1, 电压 4800mV (0x12C0)（5字节）
    const result = parseMotorInfo(dv([0x01, 0x40, 0x01, 0x12, 0xC0]), PROFILES.W96P);
    expect(result.currentMa).toBe(320);
    expect(result.block).toBe(true);
    expect(result.voltageMv).toBe(4800);
  });

  it('W66D profile 仅解析电流', () => {
    const result = parseMotorInfo(dv([0x01, 0x40, 0x01, 0x12, 0xC0]), PROFILES.W66D);
    expect(result.currentMa).toBe(320);
    expect(result.block).toBe(false);
    expect(result.voltageMv).toBe(0);
  });

  it('电机电压超 20000mV 视为脏数据置 0', () => {
    const result = parseMotorInfo(dv([0x01, 0x40, 0x00, 0xFF, 0xFF]), PROFILES.W96P);
    expect(result.voltageMv).toBe(0);
  });

  it('W96P 堵转掩码 0xF7 清除 bit3 保留位', () => {
    // 0x09 & 0xF7 = 0x01，应判为堵转
    const result = parseMotorInfo(dv([0x01, 0x40, 0x09, 0x12, 0xC0]), PROFILES.W96P);
    expect(result.block).toBe(true);
  });
});

describe('parsePowerConfig', () => {
  it('解析 16 字节快充配置', () => {
    // 构造 16 字节，关键位置：1=POW_VER, 2=POW_SINK, 3=POW_SRC, 6=1A, 7=1C, 8=1D, 9=1E, 13=2A, 14=2B, 15=2C
    const bytes = new Array(16).fill(0);
    bytes[1] = 0x40;  // POW_VER PD2.0 (bit6)
    bytes[2] = 1;     // PD Sink
    bytes[3] = 3;     // QC2.0 Source
    bytes[6] = 0x1C;  // POW_1A 默认
    bytes[7] = 0x00;  // POW_1C
    bytes[8] = 0x00;  // POW_1D
    bytes[9] = 0x00;  // POW_1E
    bytes[13] = 0x00; // POW_2A
    bytes[14] = 0x10; // POW_2B 默认
    bytes[15] = 0x04; // POW_2C 默认
    const result = parsePowerConfig(dv(bytes));
    expect(result.powVer).toBe(0x40);
    expect(result.powSink).toBe(1);
    expect(result.powSrc).toBe(3);
    expect(result.pow1A).toBe(0x1C);
    expect(result.pow1C).toBe(0x00);
    expect(result.pow1D).toBe(0x00);
    expect(result.pow1E).toBe(0x00);
    expect(result.pow2A).toBe(0x00);
    expect(result.pow2B).toBe(0x10);
    expect(result.pow2C).toBe(0x04);
  });
});
