/**
 * w96p CLI 入口
 *
 * 用法:
 *   pnpm cli --virtual [--poll 500]   虚拟设备模式（无需真机）
 *   真机模式由 CLI-3（issue #4）的 webbluetooth 传输层提供
 */

import { parseArgs } from 'node:util';
import { render } from 'ink';
import { BleManager, VirtualManager } from '@gggxbbb/w96p-ble-sdk';
import { DeviceSession } from './core/session.js';
import { NodeTransport } from './core/nodeTransport.js';
import { registerBuiltinCommands } from './core/commands.js';
import { runMcpServer } from './mcp/server.js';
import { App } from './tui/App.js';
import { cmdLogStore, redirectConsole } from './tui/logStore.js';
import { pickerStore } from './tui/pickerStore.js';

const { values } = parseArgs({
  options: {
    virtual: { type: 'boolean', default: false },
    poll: { type: 'string', default: '500' },
    name: { type: 'string' },
    mcp: { type: 'boolean', default: false },
  },
});

const pollMs = Number(values.poll);
if (!Number.isFinite(pollMs) || pollMs < 100 || pollMs > 60_000) {
  console.error('--poll 必须是 100~60000 之间的毫秒数');
  process.exit(1);
}

registerBuiltinCommands();
const session = new DeviceSession(pollMs);

// webbluetooth 的 disconnect 是 fire-and-forget：其异步失败以 unhandledRejection 形式冒出，
// 不应杀死进程——记录即可（TUI 进诊断面板，MCP 走 stderr）
process.on('unhandledRejection', (reason) => {
  console.error(`[未处理 rejection] ${reason instanceof Error ? reason.message : String(reason)}`);
});

const connectDevice = async (name?: string): Promise<void> => {
  if (values.virtual) {
    await session.connect(new VirtualManager());
    return;
  }
  // --name / connect <name> 命中即自动选中；TUI 无过滤时进交互选择（候选实时进菜单）；
  // MCP 模式没有交互界面，首台匹配设备自动选中。
  const nameFilter = (name ?? values.name)?.toLowerCase();
  const transport = new NodeTransport(
    nameFilter
      ? (device) => (device.name ?? '').toLowerCase().includes(nameFilter)
      : values.mcp
        ? undefined
        : (device, select) => {
            pickerStore.add(device, select);
            return false;
          },
  );
  pickerStore.clear();
  await session.connect(new BleManager(transport));
};

if (values.mcp) {
  // stdout 是 MCP 协议通道：console.log/warn 降级到 stderr
  console.log = (...args: unknown[]) => console.error(...args);
  console.warn = (...args: unknown[]) => console.error(...args);
  session.onError((msg) => console.error(`[设备错误] ${msg}`));
  session.onState((s) =>
    console.error(`[状态] ${s.state}${s.deviceName ? `: ${s.deviceName}` : ''}`),
  );
  await runMcpServer({ session, connectDevice });
  // server.connect 完成即 resolved——进程靠 stdin 监听保持存活；
  // 客户端断开时 stdin 'end' 处理器里 disconnect + process.exit（见 mcp/server.ts）
} else {
  const restoreConsole = redirectConsole();

  const app = render(<App session={session} connectDevice={connectDevice} />, {
    exitOnCtrlC: false,
    // 禁用 ink 自带的 console 补丁——console.* 已由 redirectConsole 引到诊断面板，
    // 否则 ink 会把它们渲染在 UI 上方，把界面往下挤
    patchConsole: false,
    // 只重写变化的行，降低全帧重绘开销（轮询+日志的高频更新下明显卡顿）
    incrementalRendering: true,
  });

  session.onError((msg) => cmdLogStore.push(`设备错误: ${msg}`));
  session.onState((s) => {
    if (s.state === 'connected') {
      pickerStore.clear();
      cmdLogStore.push(`已连接: ${s.deviceName ?? '未知设备'}`);
    } else if (s.state === 'error') {
      cmdLogStore.push('连接错误');
    } else if (s.state === 'idle') {
      cmdLogStore.push('⚠ 已断开（输入 connect 重新连接）');
    }
  });

  cmdLogStore.push(
    values.virtual
      ? '正在连接虚拟设备…'
      : `正在扫描设备${values.name ? `（--name: ${values.name}）` : ''}，稍候…`,
  );
  connectDevice().catch((e: unknown) => {
    cmdLogStore.push(`连接失败: ${e instanceof Error ? e.message : String(e)}`);
  });

  await app.waitUntilExit();
  session.disconnect();
  restoreConsole();
  process.exit(0);
}
