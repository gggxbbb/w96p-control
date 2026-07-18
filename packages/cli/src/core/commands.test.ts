/**
 * 命令注册表测试
 *
 * 唯一 seam：IBleManager。全部经 SDK VirtualManager 执行；
 * "固件不支持"路径用裁掉可选方法的替身。
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { VirtualManager, DEFAULT_SPEEDS_FULL } from '@gggxbbb/w96p-ble-sdk';
import { DeviceSession } from './session.js';
import {
  registerBuiltinCommands,
  executeLine,
  listCommands,
  type CommandContext,
} from './commands.js';

registerBuiltinCommands();

/** 轮询间隔拉大，避免虚拟设备的转速抖动干扰断言 */
const harness = () => {
  const session = new DeviceSession(100_000);
  const logs: string[] = [];
  let exitRequested = false;
  const ctx: CommandContext = {
    session,
    connectDevice: async () => {
      await session.connect(new VirtualManager());
    },
    log: (line) => logs.push(line),
    clearLog: () => {
      logs.length = 0;
    },
    requestExit: () => {
      exitRequested = true;
    },
  };
  return { session, logs, ctx, wasExitRequested: () => exitRequested };
};

let h: ReturnType<typeof harness>;

beforeEach(async () => {
  h = harness();
  await h.session.connect(new VirtualManager());
});

afterEach(() => {
  h.session.disconnect();
});

describe('会话命令', () => {
  it('help 列出全部注册命令', async () => {
    await executeLine('help', h.ctx);
    const text = h.logs.join('\n');
    for (const c of listCommands()) expect(text).toContain(c.usage);
  });

  it('未知命令给出提示', async () => {
    await executeLine('foobar', h.ctx);
    expect(h.logs.some((l) => l.includes('未知命令: foobar'))).toBe(true);
  });

  it('disconnect 后状态为未连接，connect 重连，rescan 保持连接', async () => {
    await executeLine('disconnect', h.ctx);
    expect(h.session.sessionState.connected).toBe(false);
    await executeLine('connect', h.ctx);
    expect(h.session.sessionState.connected).toBe(true);
    await executeLine('rescan', h.ctx);
    expect(h.session.sessionState.connected).toBe(true);
  });

  it('已连接时 connect 提示重复', async () => {
    await executeLine('connect', h.ctx);
    expect(h.logs.some((l) => l.includes('已处于连接状态'))).toBe(true);
  });

  it('exit 请求退出', async () => {
    await executeLine('exit', h.ctx);
    expect(h.wasExitRequested()).toBe(true);
  });
});

describe('未连接守卫', () => {
  it('设备命令在未连接时报明确错误', async () => {
    const fresh = harness();
    await executeLine('speed 50', fresh.ctx);
    expect(fresh.logs.some((l) => l.includes('未连接'))).toBe(true);
  });
});

describe('T1 调速与定时', () => {
  it('speed 写入转速', async () => {
    await executeLine('speed 80', h.ctx);
    expect(h.session.snapshot.fanSpeed).toBe(80);
    expect(h.logs.some((l) => l.includes('转速 → 80%'))).toBe(true);
  });

  it('speed 越界与非数字报错', async () => {
    await executeLine('speed 101', h.ctx);
    await executeLine('speed abc', h.ctx);
    expect(h.logs.filter((l) => l.includes('用法: speed')).length).toBe(2);
  });

  it('gear 按校准表写入对应转速', async () => {
    await executeLine('gear 2', h.ctx);
    expect(h.session.snapshot.fanSpeed).toBe(DEFAULT_SPEEDS_FULL[1]);
  });

  it('gear 0 关机', async () => {
    await executeLine('gear 0', h.ctx);
    expect(h.session.snapshot.fanSpeed).toBe(0);
  });

  it('timer 写入秒数', async () => {
    await executeLine('timer 120', h.ctx);
    expect(h.session.snapshot.timerRemainingSec).toBe(120);
  });

  it('nature 开关自然风', async () => {
    await executeLine('nature on', h.ctx);
    expect(h.session.snapshot.natureWindOn).toBe(true);
    await executeLine('nature off', h.ctx);
    expect(h.session.snapshot.natureWindOn).toBe(false);
  });

  it('nature 非法值报错', async () => {
    await executeLine('nature yes', h.ctx);
    expect(h.logs.some((l) => l.includes('on/off'))).toBe(true);
  });
});

describe('T2 电源与校准', () => {
  it('geardown 开关', async () => {
    await executeLine('geardown on', h.ctx);
    expect(h.session.snapshot.gearDownMode).toBe(1);
  });

  it('delay 写入关机延迟', async () => {
    await executeLine('delay 30', h.ctx);
    expect(h.session.snapshot.shutdownDelaySec).toBe(30);
  });

  it('calib 写入四档校准', async () => {
    await executeLine('calib 10 20 30 40', h.ctx);
    expect(h.session.snapshot.speedCalib).toEqual([10, 20, 30, 40]);
  });

  it('calib 递减序列被拒', async () => {
    await executeLine('calib 50 40 30 20', h.ctx);
    expect(h.logs.some((l) => l.includes('非递减'))).toBe(true);
  });

  it('calib 参数个数不足被拒', async () => {
    await executeLine('calib 10 20 30', h.ctx);
    expect(h.logs.some((l) => l.includes('用法: calib'))).toBe(true);
  });

  it('battcap 写入电池容量', async () => {
    await executeLine('battcap 5000 3.7', h.ctx);
    expect(await h.session.requireManager().readBatteryCapacity()).toBe(18500);
  });

  it('powswitch 按名寻址并写入寄存器位（取反语义）', async () => {
    // pd_src 是 inverted 位：off 写入 1
    await executeLine('powswitch pd_src off', h.ctx);
    expect(h.session.snapshot.powerConfig?.pow1C).toBe(0x20);
    // on 写回 0
    await executeLine('powswitch pd_src on', h.ctx);
    expect(h.session.snapshot.powerConfig?.pow1C).toBe(0x00);
  });

  it('powswitch 未知开关名列出可用项', async () => {
    await executeLine('powswitch nope on', h.ctx);
    expect(h.logs.some((l) => l.includes('未知开关') && l.includes('pd_src'))).toBe(true);
  });
});

describe('T3 固件可选功能', () => {
  it('turbo/turbotime/light/blename/blesn 在支持时执行成功', async () => {
    await executeLine('turbo on', h.ctx);
    await executeLine('turbotime 60', h.ctx);
    await executeLine('light 2', h.ctx);
    await executeLine('blename 我的风扇', h.ctx);
    await executeLine('blesn on', h.ctx);
    expect(h.logs.some((l) => l.includes('Turbo → 开'))).toBe(true);
    expect(h.logs.some((l) => l.includes('Turbo 时长 → 60s'))).toBe(true);
    expect(h.logs.some((l) => l.includes('灯光 → 2'))).toBe(true);
    expect(h.logs.some((l) => l.includes('蓝牙名称 → 我的风扇'))).toBe(true);
    expect(h.logs.some((l) => l.includes('BLE_SN 显示 → 开'))).toBe(true);
  });

  it('可选方法缺失时报"固件不支持"', async () => {
    const trimmed = new VirtualManager();
    Object.defineProperty(trimmed, 'writeTurbo', { value: undefined });
    const h2 = harness();
    await h2.session.connect(trimmed);
    await executeLine('turbo on', h2.ctx);
    expect(h2.logs.some((l) => l.includes('固件不支持 Turbo'))).toBe(true);
    h2.session.disconnect();
  });
});
