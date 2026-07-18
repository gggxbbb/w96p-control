/**
 * 仅扫描不连接
 *
 * 供 scan 命令 / fan_scan 工具：agent 或用户先探活（风扇是否在附近），
 * 再决定是否 fan_connect。窗口内命中即提前返回；
 * 首个 watcher 可能哑（见 nodeTransport 注释），故按窗口循环至总时限。
 */

import { Bluetooth } from 'webbluetooth';
import { MAIN_SERVICE } from '@gggxbbb/w96p-ble-sdk';
import type { FoundDeviceInfo } from './nodeTransport.js';

export async function scanFans(windowSec = 5): Promise<FoundDeviceInfo[]> {
  const deadline = Date.now() + windowSec * 1000;
  const found = new Map<string, FoundDeviceInfo>();

  while (found.size === 0 && Date.now() < deadline) {
    const windowMs = Math.min(3000, deadline - Date.now());
    const { promise: firstFound, resolve: signalFound } = Promise.withResolvers<void>();
    const bluetooth = new Bluetooth({
      scanTime: windowMs / 1000,
      deviceFound: (device) => {
        found.set(device.id, { id: device.id, name: device.name ?? null });
        signalFound();
        return false; // 不选中，仅收集
      },
    });
    // requestDevice 在 found=true 时超时不会 settle（webbluetooth 语义），
    // 因此到点主动 cancelRequest 收尾；悬挂的 promise 无定时器残留可被 GC
    const scan = bluetooth
      .requestDevice({ filters: [{ services: [MAIN_SERVICE] }] })
      .catch(() => undefined);
    const { promise: windowElapsed, resolve: elapse } = Promise.withResolvers<void>();
    setTimeout(elapse, windowMs);
    await Promise.race([firstFound, windowElapsed]);
    bluetooth.cancelRequest();
    void scan;
  }

  return [...found.values()];
}
