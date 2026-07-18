/**
 * DeviceSession 连接生命周期测试
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { VirtualManager } from '@gggxbbb/w96p-ble-sdk';
import { DeviceSession } from './session.js';

/** 模拟 BleManager.connect 的失败形态：不抛异常，只发 error 状态 */
class FailingManager extends VirtualManager {
  override async connect(): Promise<void> {
    this.onState?.('connecting');
    this.onState?.('error');
  }
}

afterEach(() => {
  vi.useRealTimers();
});

describe('DeviceSession', () => {
  it('manager 报告连接失败时拒绝、不启动轮询、脱离管理器', async () => {
    vi.useFakeTimers();
    const session = new DeviceSession(50);
    await expect(session.connect(new FailingManager())).rejects.toThrow('连接失败');
    expect(session.sessionState.state).toBe('idle');
    expect(() => session.requireManager()).toThrow('未连接');
    // 推进多个轮询周期：若轮询被错误启动，快照会出现字段
    await vi.advanceTimersByTimeAsync(500);
    expect(session.snapshot).toEqual({});
  });

  it('连接成功后按间隔轮询并累积快照', async () => {
    vi.useFakeTimers();
    const session = new DeviceSession(50);
    const pending = session.connect(new VirtualManager());
    // 驱动 VirtualManager.connect 内部的 300ms 延迟
    await vi.advanceTimersByTimeAsync(300);
    await pending;
    expect(session.sessionState.connected).toBe(true);
    // 推进数个轮询周期，快照应出现轮询字段
    await vi.advanceTimersByTimeAsync(150);
    expect(session.snapshot.fanSpeed).toBeDefined();
    session.disconnect();
  });
});
