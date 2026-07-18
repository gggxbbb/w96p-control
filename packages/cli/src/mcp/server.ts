/**
 * MCP server 模式
 *
 * stdio 传输：stdout 仅供协议，一切日志走 stderr（调用方需先重定向 console）。
 * 连接生命周期显式化：fan_connect / fan_disconnect 由 agent 控制；
 * 设备工具未连接时返回结构化错误（isError: true）。
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type { DeviceSession } from '../core/session.js';
import { registerBuiltinCommands, type CommandContext } from '../core/commands.js';
import { commandForToolName, toolArgsToTokens, toolListFromRegistry } from './tools.js';

export interface McpServerOptions {
  session: DeviceSession;
  connectDevice: (name?: string) => Promise<void>;
}

const errorResult = (message: string) => ({
  content: [{ type: 'text' as const, text: message }],
  isError: true,
});

export async function runMcpServer(opts: McpServerOptions): Promise<void> {
  const { session, connectDevice } = opts;
  registerBuiltinCommands();

  const server = new Server(
    { name: 'w96p-cli', version: '0.0.0' },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: toolListFromRegistry(),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: input } = req.params;
    try {
      // fan_status 返回完整结构化快照（其余命令返回文本结果）
      if (name === 'fan_status') {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                { session: session.sessionState, snapshot: session.snapshot },
                null,
                2,
              ),
            },
          ],
        };
      }

      const cmd = commandForToolName(name);
      if (!cmd) return errorResult(`未知工具: ${name}`);

      const tokens = toolArgsToTokens(cmd, (input ?? {}) as Record<string, unknown>);
      const lines: string[] = [];
      const ctx: CommandContext = {
        session,
        connectDevice,
        log: (line) => lines.push(line),
        clearLog: () => undefined,
        requestExit: () => undefined,
      };
      await cmd.execute(tokens, ctx);

      // fan_connect 成功后等首个轮询快照（≤1.5s），避免紧随的 fan_status 拿到空快照
      if (name === 'fan_connect' && session.sessionState.connected) {
        if (session.snapshot.fanSpeed === undefined) {
          await new Promise<void>((resolve) => {
            const timer = setTimeout(resolve, 1500);
            const off = session.onSnapshot(() => {
              clearTimeout(timer);
              off();
              resolve();
            });
          });
        }
        lines.push(
          `已连接: ${session.sessionState.deviceName ?? '未知设备'}（快照已就绪）`,
        );
      }

      return { content: [{ type: 'text' as const, text: lines.join('\n') || 'OK' }] };
    } catch (e) {
      return errorResult(e instanceof Error ? e.message : String(e));
    }
  });

  await server.connect(new StdioServerTransport());

  // SDK 的 StdioServerTransport 不监听 stdin 'end'，自行处理客户端断开：
  // 未连接时进程会随事件循环清空自然退出；已连接时必须显式断开并退出
  process.stdin.once('end', () => {
    opts.session.disconnect();
    process.exit(0);
  });
}
