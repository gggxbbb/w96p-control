/**
 * 状态面板格式化测试（纯函数）
 */

import { describe, it, expect } from 'vitest';
import type { BleSnapshot } from '@gggxbbb/w96p-ble-sdk';
import { formatStatusLines } from './formatStatus.js';
import type { SessionState } from './session.js';

const connected: SessionState = {
  state: 'connected',
  deviceName: '虚拟 W96P',
  isCompat: false,
  connected: true,
};

const fullSnap: BleSnapshot = {
  fanSpeed: 50,
  timerRemainingSec: 754,
  natureWindOn: false,
  shutdownDelaySec: 60,
  gearDownMode: 0,
  turboCountdownSec: 12,
  speedCalib: [10, 35, 70, 100],
  firmwareVersion: '1.30',
  serialNumber: '21030001',
  bleSnEnabled: true,
  battery: {
    voltageMv: 4050,
    currentMa: 120,
    capacityMwh: 18000,
    chgMwh: 0,
    dchgMwh: 0,
    rcapMwh: 12000,
    tempC: 26,
    chgTimeS: 0,
    dchgTimeS: 0,
  },
  powerStatus: {
    vbusVmV: 5000,
    vbusCurMa: 1000,
    vbusConnected: true,
    powC: 1,
    powSta: 1,
    powCOut: true,
    powCIn: true,
    powCHi: false,
  },
  motor: { currentMa: 900, block: false, voltageMv: 4800 },
};

describe('formatStatusLines', () => {
  it('未连接时只输出状态行', () => {
    const lines = formatStatusLines(
      { state: 'idle', isCompat: false, connected: false },
      {},
    );
    expect(lines).toEqual(['未连接']);
  });

  it('完整快照输出六行全部字段', () => {
    const lines = formatStatusLines(connected, fullSnap);
    expect(lines.length).toBe(6);
    expect(lines[0]).toContain('已连接');
    expect(lines[0]).toContain('虚拟 W96P');
    expect(lines[0]).toContain('标准模式');
    expect(lines[0]).toContain('1.30');
    expect(lines[0]).toContain('21030001');
    expect(lines[1]).toContain('转速 50%');
    expect(lines[1]).toContain('自然风 关');
    expect(lines[1]).toContain('定时 12:34');
    expect(lines[1]).toContain('关机延迟 60s');
    expect(lines[1]).toContain('降档 0');
    expect(lines[1]).toContain('Turbo 12s');
    expect(lines[2]).toContain('4.05V');
    expect(lines[2]).toContain('+120mA');
    expect(lines[2]).toContain('26℃');
    expect(lines[2]).toContain('12000/18000mWh');
    expect(lines[3]).toContain('VBUS 5.00V/1000mA');
    expect(lines[3]).toContain('充电');
    expect(lines[3]).toContain('C入✓');
    expect(lines[3]).toContain('C出✓');
    expect(lines[3]).toContain('高压✗');
    expect(lines[4]).toContain('900mA');
    expect(lines[4]).toContain('4.80V');
    expect(lines[4]).toContain('正常');
    expect(lines[5]).toContain('[10 35 70 100]');
    expect(lines[5]).toContain('BLE_SN 开');
  });

  it('已连接但快照为空时全部占位', () => {
    const lines = formatStatusLines(connected, {});
    expect(lines[1]).toContain('转速 —');
    expect(lines[1]).toContain('定时 —');
    expect(lines[2]).toBe('电池 —');
    expect(lines[3]).toBe('电源 —');
    expect(lines[4]).toBe('电机 —');
    expect(lines[5]).toContain('校准 —');
    expect(lines[5]).toContain('BLE_SN —');
  });

  it('兼容模式显示 W66D 且电机电压占位', () => {
    const lines = formatStatusLines(
      { ...connected, isCompat: true },
      fullSnap,
    );
    expect(lines[0]).toContain('兼容模式(W66D)');
    expect(lines[4]).toContain('—');
    expect(lines[4]).not.toContain('4.80V');
  });
});
