/**
 * MCP 工具定义生成（纯函数）
 *
 * 从命令注册表生成 MCP tools：fan_<命令名> 一一对应，
 * inputSchema 由命令的 args 声明推导。help/clear/exit/quit 不对外暴露。
 */

import { listCommands, type ArgSpec, type Command } from '../core/commands.js';

export interface McpToolDef {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

/** TUI 专用命令，不作为 MCP 工具暴露 */
const EXCLUDED = new Set(['help', 'clear', 'exit', 'quit']);

const JSON_TYPE: Record<ArgSpec['type'], string> = {
  int: 'integer',
  number: 'number',
  string: 'string',
  bool: 'boolean',
};

export function toolListFromRegistry(): McpToolDef[] {
  return listCommands()
    .filter((c) => !EXCLUDED.has(c.name))
    .map((c) => ({
      name: `fan_${c.name}`,
      description: `${c.description}（用法: ${c.usage}）`,
      inputSchema: schemaFromArgs(c.args ?? []),
    }));
}

function schemaFromArgs(args: ArgSpec[]): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];
  for (const a of args) {
    const schema: Record<string, unknown> = { type: JSON_TYPE[a.type] };
    if (a.description) schema.description = a.description;
    if (a.min !== undefined) schema.minimum = a.min;
    if (a.max !== undefined) schema.maximum = a.max;
    properties[a.name] = schema;
    if (a.required) required.push(a.name);
  }
  return { type: 'object', properties, required, additionalProperties: false };
}

/** 工具名 → 注册表命令（fan_ 前缀；排除项不可达） */
export function commandForToolName(toolName: string): Command | undefined {
  if (!toolName.startsWith('fan_')) return undefined;
  const name = toolName.slice(4);
  if (EXCLUDED.has(name)) return undefined;
  return listCommands().find((c) => c.name === name);
}

/** 把 MCP 调用的 JSON 参数转成命令层的字符串 token 序列 */
export function toolArgsToTokens(cmd: Command, input: Record<string, unknown>): string[] {
  const tokens: string[] = [];
  for (const a of cmd.args ?? []) {
    const v = input[a.name];
    if (v === undefined) {
      if (a.required) throw new Error(`缺少参数: ${a.name}`);
      continue;
    }
    if (a.type === 'bool') tokens.push(v ? 'on' : 'off');
    else if (a.rest) tokens.push(...String(v).split(/\s+/));
    else tokens.push(String(v));
  }
  return tokens;
}
