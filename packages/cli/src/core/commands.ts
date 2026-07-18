/**
 * 命令注册表
 *
 * TUI 与 MCP server 的单一事实源：每条命令声明名称/用法/描述/处理函数。
 * 处理函数只依赖 CommandContext，不感知渲染层或 MCP 协议。
 */

import { POW_SWITCHES } from '@gggxbbb/w96p-ble-sdk';
import type { IBleManager } from '@gggxbbb/w96p-ble-sdk';
import type { DeviceSession } from './session.js';
import { formatStatusLines } from './formatStatus.js';
import { scanFans } from './scan.js';

export interface CommandContext {
  session: DeviceSession;
  /** 由入口注入：新建 manager 并完成 session.connect（虚拟设备或真机）；name 可收窄匹配 */
  connectDevice: (name?: string) => Promise<void>;
  log: (line: string) => void;
  clearLog: () => void;
  requestExit: () => void;
}

/** 命令参数声明（TUI 用法提示与 MCP inputSchema 的单一事实源） */
export interface ArgSpec {
  name: string;
  type: 'int' | 'number' | 'string' | 'bool';
  required: boolean;
  min?: number;
  max?: number;
  /** 收集剩余全部参数（如 blename 的名称） */
  rest?: boolean;
  description?: string;
}

export interface Command {
  name: string;
  usage: string;
  description: string;
  args?: ArgSpec[];
  execute(args: string[], ctx: CommandContext): Promise<void> | void;
}

const registry = new Map<string, Command>();

export function registerCommand(cmd: Command): void {
  registry.set(cmd.name, cmd);
}

export function listCommands(): Command[] {
  return [...registry.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** 解析并执行一行输入；所有错误转为日志输出，不抛出 */
export async function executeLine(line: string, ctx: CommandContext): Promise<void> {
  const trimmed = line.trim();
  if (!trimmed) return;
  ctx.log(`w96p> ${trimmed}`);
  const [name, ...args] = trimmed.split(/\s+/);
  const cmd = registry.get(name!.toLowerCase());
  if (!cmd) {
    ctx.log(`未知命令: ${name}（输入 help 查看可用命令）`);
    return;
  }
  try {
    await cmd.execute(args, ctx);
  } catch (e) {
    ctx.log(`错误: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/* ── 参数解析 ── */

function parseBool(token: string | undefined, usage: string): boolean {
  if (token === 'on' || token === '1') return true;
  if (token === 'off' || token === '0') return false;
  throw new Error(`无效开关值${token === undefined ? '' : `: ${token}`}（用 on/off）。用法: ${usage}`);
}

function parseIntRange(token: string | undefined, min: number, max: number, usage: string): number {
  const n = Number(token);
  if (token === undefined || !Number.isInteger(n) || n < min || n > max) {
    throw new Error(`参数必须是 ${min}~${max} 的整数。用法: ${usage}`);
  }
  return n;
}

function requireConnected(ctx: CommandContext): IBleManager {
  return ctx.session.requireManager();
}

/* ── 内置命令 ── */

let builtinsRegistered = false;

/** 注册内置命令（幂等） */
export function registerBuiltinCommands(): void {
  if (builtinsRegistered) return;
  builtinsRegistered = true;

  /* ── 会话 ── */

  registerCommand({
    name: 'help',
    usage: 'help',
    description: '列出全部命令',
    execute: (_args, ctx) => {
      ctx.log('可用命令:');
      for (const c of listCommands()) ctx.log(`  ${c.usage.padEnd(28)} ${c.description}`);
    },
  });

  registerCommand({
    name: 'status',
    usage: 'status',
    description: '输出当前设备状态快照',
    execute: (_args, ctx) => {
      for (const line of formatStatusLines(ctx.session.sessionState, ctx.session.snapshot)) {
        ctx.log(line);
      }
    },
  });

  registerCommand({
    name: 'scan',
    usage: 'scan [秒]',
    description: '仅扫描不连接，列出附近风扇（默认 5s）',
    args: [{ name: 'windowSec', type: 'int', required: false, min: 1, max: 30 }],
    execute: async (args, ctx) => {
      const sec = args[0] === undefined ? 5 : parseIntRange(args[0], 1, 30, 'scan [秒]');
      ctx.log(`扫描 ${sec}s…`);
      const devices = await scanFans(sec);
      if (devices.length === 0) {
        ctx.log('未发现设备（确认风扇已开机并在附近）');
        return;
      }
      for (const d of devices) ctx.log(`发现: ${d.name ?? '(无名)'}  ${d.id}`);
    },
  });

  registerCommand({
    name: 'connect',
    usage: 'connect',
    description: '扫描并连接设备',
    args: [{ name: 'name', type: 'string', required: false, description: '按名称子串匹配设备' }],
    execute: async (_args, ctx) => {
      if (ctx.session.sessionState.connected) {
        ctx.log('已处于连接状态');
        return;
      }
      if (ctx.session.sessionState.state === 'connecting') {
        ctx.log('正在连接中…');
        return;
      }
      await ctx.connectDevice(_args[0]);
    },
  });

  registerCommand({
    name: 'disconnect',
    usage: 'disconnect',
    description: '断开当前连接',
    execute: (_args, ctx) => {
      if (!ctx.session.sessionState.connected) {
        ctx.log('未连接');
        return;
      }
      ctx.session.disconnect();
    },
  });

  registerCommand({
    name: 'rescan',
    usage: 'rescan',
    description: '重新扫描并连接',
    execute: async (_args, ctx) => {
      if (ctx.session.sessionState.state === 'connecting') {
        ctx.log('正在连接中…');
        return;
      }
      ctx.session.disconnect();
      await ctx.connectDevice();
    },
  });

  registerCommand({
    name: 'clear',
    usage: 'clear',
    description: '清空日志面板',
    execute: (_args, ctx) => {
      ctx.clearLog();
    },
  });

  for (const name of ['exit', 'quit']) {
    registerCommand({
      name,
      usage: name,
      description: '断开连接并退出',
      execute: (_args, ctx) => {
        ctx.requestExit();
      },
    });
  }

  /* ── T1 调速与定时 ── */

  registerCommand({
    name: 'speed',
    usage: 'speed <0-100>',
    description: '设置转速百分比',
    args: [{ name: 'pct', type: 'int', required: true, min: 0, max: 100 }],
    execute: async (args, ctx) => {
      const pct = parseIntRange(args[0], 0, 100, 'speed <0-100>');
      await requireConnected(ctx).writeFanSpeed(pct);
      ctx.log(`转速 → ${pct}%`);
    },
  });

  registerCommand({
    name: 'gear',
    usage: 'gear <0-4>',
    description: '设置档位（0=关机）',
    args: [{ name: 'gear', type: 'int', required: true, min: 0, max: 4 }],
    execute: async (args, ctx) => {
      const gear = parseIntRange(args[0], 0, 4, 'gear <0-4>') as 0 | 1 | 2 | 3 | 4;
      await requireConnected(ctx).writeGear(gear);
      ctx.log(`档位 → ${gear}`);
    },
  });

  registerCommand({
    name: 'timer',
    usage: 'timer <秒>',
    description: '设置定时（秒），0=取消',
    args: [{ name: 'sec', type: 'int', required: true, min: 0, max: 65535 }],
    execute: async (args, ctx) => {
      const sec = parseIntRange(args[0], 0, 65535, 'timer <秒>');
      await requireConnected(ctx).writeTimer(sec);
      ctx.log(sec === 0 ? '定时已取消' : `定时 → ${sec}s`);
    },
  });

  registerCommand({
    name: 'delay',
    usage: 'delay <秒>',
    description: '设置关机延迟（秒）',
    args: [{ name: 'sec', type: 'int', required: true, min: 0, max: 65535 }],
    execute: async (args, ctx) => {
      const sec = parseIntRange(args[0], 0, 65535, 'delay <秒>');
      await requireConnected(ctx).writeShutdownDelay(sec);
      ctx.log(`关机延迟 → ${sec}s`);
    },
  });

  registerCommand({
    name: 'nature',
    usage: 'nature <on|off>',
    description: '自然风开关',
    args: [{ name: 'on', type: 'bool', required: true }],
    execute: async (args, ctx) => {
      const on = parseBool(args[0], 'nature <on|off>');
      await requireConnected(ctx).writeNatureWind(on);
      ctx.log(`自然风 → ${on ? '开' : '关'}`);
    },
  });

  /* ── T2 电源与校准 ── */

  registerCommand({
    name: 'geardown',
    usage: 'geardown <on|off>',
    description: '降档模式开关',
    args: [{ name: 'on', type: 'bool', required: true }],
    execute: async (args, ctx) => {
      const on = parseBool(args[0], 'geardown <on|off>');
      await requireConnected(ctx).writeGearDownMode(on ? 1 : 0);
      ctx.log(`降档模式 → ${on ? '开' : '关'}`);
    },
  });

  registerCommand({
    name: 'calib',
    usage: 'calib <1档> <2档> <3档> <4档>',
    description: '设置档位风速校准（0-100，非递减）',
    args: [
      { name: 'g1', type: 'int', required: true, min: 0, max: 100 },
      { name: 'g2', type: 'int', required: true, min: 0, max: 100 },
      { name: 'g3', type: 'int', required: true, min: 0, max: 100 },
      { name: 'g4', type: 'int', required: true, min: 0, max: 100 },
    ],
    execute: async (args, ctx) => {
      if (args.length !== 4) throw new Error('需要 4 个参数。用法: calib <1档> <2档> <3档> <4档>');
      const speeds = args.map((a) => parseIntRange(a, 0, 100, 'calib <1档> <2档> <3档> <4档>'));
      for (let i = 1; i < 4; i++) {
        if (speeds[i]! < speeds[i - 1]!) throw new Error('校准值必须非递减');
      }
      await requireConnected(ctx).writeSpeedCalib(speeds as [number, number, number, number]);
      ctx.log(`校准 → [${speeds.join(', ')}]`);
    },
  });

  registerCommand({
    name: 'battcap',
    usage: 'battcap <mAh> <标称电压V>',
    description: '设置电池容量',
    args: [
      { name: 'mah', type: 'int', required: true, min: 1, max: 100000 },
      { name: 'voltage', type: 'number', required: true, min: 0, max: 30 },
    ],
    execute: async (args, ctx) => {
      const mah = parseIntRange(args[0], 1, 100000, 'battcap <mAh> <标称电压V>');
      const v = Number(args[1]);
      if (!Number.isFinite(v) || v <= 0 || v > 30) {
        throw new Error('电压必须是 0~30 之间的数。用法: battcap <mAh> <标称电压V>');
      }
      await requireConnected(ctx).writeBatteryCapacity(mah, v);
      ctx.log(`电池容量 → ${mah}mAh @ ${v}V`);
    },
  });

  registerCommand({
    name: 'powswitch',
    usage: `powswitch <开关名> <on|off>`,
    description: '电源寄存器开关（见 POW_SWITCHES）',
    args: [
      { name: 'key', type: 'string', required: true, description: 'POW_SWITCHES 开关名' },
      { name: 'on', type: 'bool', required: true },
    ],
    execute: async (args, ctx) => {
      const def = POW_SWITCHES.find((s) => s.key === args[0]);
      if (!def) {
        throw new Error(`未知开关: ${args[0] ?? '(空)'}。可用: ${POW_SWITCHES.map((s) => s.key).join(' ')}`);
      }
      const on = parseBool(args[1], `powswitch ${def.key} <on|off>`);
      await requireConnected(ctx).writePowSwitch(def.reg, def.bit, on, def.inverted ?? false);
      ctx.log(`${def.label}(${def.key}) → ${on ? '开' : '关'}`);
    },
  });

  /* ── T3 固件可选功能 ── */

  registerCommand({
    name: 'turbo',
    usage: 'turbo <on|off>',
    description: 'Turbo 模式开关（v1.3+）',
    args: [{ name: 'on', type: 'bool', required: true }],
    execute: async (args, ctx) => {
      const on = parseBool(args[0], 'turbo <on|off>');
      const m = requireConnected(ctx);
      if (!m.writeTurbo) throw new Error('固件不支持 Turbo（需要 v1.3+）');
      await m.writeTurbo(on);
      ctx.log(`Turbo → ${on ? '开' : '关'}`);
    },
  });

  registerCommand({
    name: 'turbotime',
    usage: 'turbotime <1-199秒>',
    description: '设置 Turbo 时长（v1.3+）',
    args: [{ name: 'sec', type: 'int', required: true, min: 1, max: 199 }],
    execute: async (args, ctx) => {
      const sec = parseIntRange(args[0], 1, 199, 'turbotime <1-199秒>');
      const m = requireConnected(ctx);
      if (!m.writeTurboTime) throw new Error('固件不支持 Turbo（需要 v1.3+）');
      await m.writeTurboTime(sec);
      ctx.log(`Turbo 时长 → ${sec}s`);
    },
  });

  registerCommand({
    name: 'light',
    usage: 'light <0-4>',
    description: '灯光亮度（0=关灯，v1.3+）',
    args: [{ name: 'level', type: 'int', required: true, min: 0, max: 4 }],
    execute: async (args, ctx) => {
      const value = parseIntRange(args[0], 0, 4, 'light <0-4>');
      const m = requireConnected(ctx);
      if (!m.writeLight) throw new Error('固件不支持灯光控制（需要 v1.3+）');
      await m.writeLight(value);
      ctx.log(`灯光 → ${value}`);
    },
  });

  registerCommand({
    name: 'blename',
    usage: 'blename <名称>',
    description: '修改蓝牙名称（v1.3+）',
    args: [{ name: 'name', type: 'string', required: true, rest: true }],
    execute: async (args, ctx) => {
      const name = args.join(' ').trim();
      if (!name) throw new Error('名称不能为空。用法: blename <名称>');
      const m = requireConnected(ctx);
      if (!m.writeBleName) throw new Error('固件不支持改名（需要 v1.3+）');
      await m.writeBleName(name);
      ctx.log(`蓝牙名称 → ${name}`);
    },
  });

  registerCommand({
    name: 'blesn',
    usage: 'blesn <on|off>',
    description: 'BLE 序列号显示开关（v1.7+）',
    args: [{ name: 'on', type: 'bool', required: true }],
    execute: async (args, ctx) => {
      const on = parseBool(args[0], 'blesn <on|off>');
      const m = requireConnected(ctx);
      if (!m.writeBleSn) throw new Error('固件不支持 BLE_SN（需要 v1.7+）');
      await m.writeBleSn(on);
      ctx.log(`BLE_SN 显示 → ${on ? '开' : '关'}`);
    },
  });
}
