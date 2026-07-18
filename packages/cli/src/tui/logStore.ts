/**
 * 日志存储
 *
 * 两条独立通道：
 * - cmdLogStore：命令回显/结果与连接生命周期事件（左面板）
 * - diagLogStore：SDK 诊断输出（console.* 重定向，右面板）
 *
 * 模块级单例：console 重定向需要在 React 挂载前就生效。
 */

type Listener = () => void;

interface LogStore {
  push(line: string): void;
  clear(): void;
  getLines(): string[];
  subscribe(fn: Listener): () => void;
}

function createLogStore(maxLines: number): LogStore {
  let lines: string[] = [];
  const listeners = new Set<Listener>();
  // 通知节流：日志可能每 500ms 突发数行，逐行通知会导致全帧重绘风暴；
  // 合并到 150ms 窗口，渲染帧率封顶（数据即时入列，不丢）
  let flushScheduled = false;
  const notify = (): void => {
    if (flushScheduled) return;
    flushScheduled = true;
    setTimeout(() => {
      flushScheduled = false;
      for (const fn of listeners) fn();
    }, 150);
  };
  return {
    push(line) {
      lines = [...lines.slice(-(maxLines - 1)), line];
      notify();
    },
    clear() {
      lines = [];
      notify();
    },
    getLines() {
      return lines;
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
  };
}

export const cmdLogStore = createLogStore(300);
export const diagLogStore = createLogStore(500);

/** 把 console.* 重定向进诊断面板，返回恢复函数 */
export function redirectConsole(): () => void {
  const orig = { log: console.log, warn: console.warn, error: console.error };
  const fmt = (args: unknown[]): string =>
    args.map((a) => (typeof a === 'string' ? a : String(a))).join(' ');
  console.log = (...args: unknown[]) => diagLogStore.push(fmt(args));
  console.warn = (...args: unknown[]) => diagLogStore.push(`[warn] ${fmt(args)}`);
  console.error = (...args: unknown[]) => diagLogStore.push(`[error] ${fmt(args)}`);
  return () => {
    console.log = orig.log;
    console.warn = orig.warn;
    console.error = orig.error;
  };
}
