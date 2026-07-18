/**
 * 设备选择器存储
 *
 * 扫描期间候选设备实时累积（跨重试窗口），TUI 方向键菜单订阅。
 * webbluetooth 语义：found=true 时超时窗口不 reject，selectFn 之后仍可调用。
 */

import type { FoundDeviceInfo } from '../core/nodeTransport.js';

export interface Candidate extends FoundDeviceInfo {
  /** 选中该设备（最近一次出现时的 selectFn） */
  select: () => void;
}

type Listener = () => void;

let candidates: Candidate[] = [];
const listeners = new Set<Listener>();

const notify = (): void => {
  for (const fn of listeners) fn();
};

export const pickerStore = {
  /** 设备出现：按 id 去重，select 更新为最新一次 */
  add(device: FoundDeviceInfo, select: () => void): void {
    const existing = candidates.find((c) => c.id === device.id);
    if (existing) {
      existing.select = select;
      existing.name = device.name;
    } else {
      candidates = [...candidates, { ...device, select }];
    }
    notify();
  },
  clear(): void {
    candidates = [];
    notify();
  },
  getCandidates(): Candidate[] {
    return candidates;
  },
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
};
