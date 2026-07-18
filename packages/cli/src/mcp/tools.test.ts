/**
 * MCP 工具生成测试（纯函数）
 */

import { describe, it, expect } from 'vitest';
import { registerBuiltinCommands } from '../core/commands.js';
import { commandForToolName, toolArgsToTokens, toolListFromRegistry } from './tools.js';

registerBuiltinCommands();

describe('toolListFromRegistry', () => {
  const tools = toolListFromRegistry();
  const byName = new Map(tools.map((t) => [t.name, t]));

  it('设备命令与会话命令一一对应为 fan_ 前缀工具', () => {
    for (const name of [
      'fan_connect', 'fan_disconnect', 'fan_rescan', 'fan_status',
      'fan_speed', 'fan_gear', 'fan_timer', 'fan_delay', 'fan_nature',
      'fan_geardown', 'fan_calib', 'fan_battcap', 'fan_powswitch',
      'fan_turbo', 'fan_turbotime', 'fan_light', 'fan_blename', 'fan_blesn',
    ]) {
      expect(byName.has(name), name).toBe(true);
    }
  });

  it('TUI 专用命令不暴露', () => {
    for (const name of ['fan_help', 'fan_clear', 'fan_exit', 'fan_quit']) {
      expect(byName.has(name)).toBe(false);
    }
  });

  it('inputSchema 从 args 声明推导（类型/范围/required）', () => {
    const speed = byName.get('fan_speed')!;
    expect(speed.inputSchema).toMatchObject({
      type: 'object',
      properties: { pct: { type: 'integer', minimum: 0, maximum: 100 } },
      required: ['pct'],
    });
    const connect = byName.get('fan_connect')!;
    expect(connect.inputSchema).toMatchObject({ required: [] });
    const turbo = byName.get('fan_turbo')!;
    expect(turbo.inputSchema).toMatchObject({
      properties: { on: { type: 'boolean' } },
      required: ['on'],
    });
  });
});

describe('commandForToolName', () => {
  it('fan_ 前缀反查命令；排除项与前缀不符返回 undefined', () => {
    expect(commandForToolName('fan_speed')?.name).toBe('speed');
    expect(commandForToolName('fan_exit')).toBeUndefined();
    expect(commandForToolName('speed')).toBeUndefined();
  });
});

describe('toolArgsToTokens', () => {
  it('bool 转 on/off，rest 拆分，缺失必填报错', () => {
    const turbo = commandForToolName('fan_turbo')!;
    expect(toolArgsToTokens(turbo, { on: true })).toEqual(['on']);
    expect(toolArgsToTokens(turbo, { on: false })).toEqual(['off']);

    const blename = commandForToolName('fan_blename')!;
    expect(toolArgsToTokens(blename, { name: '我的 风扇' })).toEqual(['我的', '风扇']);

    const speed = commandForToolName('fan_speed')!;
    expect(toolArgsToTokens(speed, { pct: 80 })).toEqual(['80']);
    expect(() => toolArgsToTokens(speed, {})).toThrow('缺少参数');
  });
});
