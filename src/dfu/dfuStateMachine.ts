import type { DfuManager } from './dfuManager';
import {
  buildControlPayload,
  buildWriteFlashPayload,
  buildUnlockPayload,
  alignTo4,
  parseVersion,
  parsePageSize,
  CTRL_GET_VERSION,
  CTRL_CHECK_IN_DFU,
  CTRL_ENTER_DFU,
  CTRL_GET_PAGE_SIZE,
  CTRL_START_UP,
  CTRL_END_UP,
  CTRL_RESET,
  CTRL_OK,
} from './dfuProtocol';
import type { FirmwareInfo } from './firmware';
import { FLASH_OFFSET } from './firmware';
import type { DfuStep } from '../stores/dfu';
import { useDfuStore } from '../stores/dfu';

const DFU_TIMEOUT_NORMAL = 3000;
const DFU_TIMEOUT_START_UP = 12000;
const DFU_TIMEOUT_END_UP = 12000;
const WRITE_FLASH_INTERVAL_MS = 5;
const UNLOCK_BYTES = 96;
const MAX_RETRY = 3;

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function setStep(step: DfuStep, label: string): void {
  const s = useDfuStore.getState();
  s.setStep(step, label);
  s.appendLog(`[${label}]`, 'info');
}

export class DfuStateMachine {
  private manager: DfuManager;
  private firmware: FirmwareInfo;
  private pageSize = 0;
  private chunkSize = 0;
  private aborted = false;

  constructor(manager: DfuManager, firmware: FirmwareInfo) {
    this.manager = manager;
    this.firmware = firmware;
  }

  abort(): void {
    this.aborted = true;
  }

  /** 执行完整升级流程 */
  async execute(): Promise<void> {
    const store = useDfuStore.getState();
    store.appendLog('===== DFU 升级流程开始 =====', 'info');
    store.appendLog(
      `目标固件: ${this.firmware.productName} ${this.firmware.version}`,
      'info',
    );
    store.appendLog(`固件大小: ${(this.firmware.fileSize / 1024).toFixed(1)} KB`, 'info');

    try {
      await this.stepConnect();
      if (this.aborted) return;

      await this.withRetry(() => this.stepGetVersion(), '查询版本', MAX_RETRY);
      if (this.aborted) return;

      // stepCheckInDfu may internally skip enter_dfu if already in DFU
      await this.withRetry(() => this.stepCheckInDfu(), '检查 DFU 模式', MAX_RETRY);
      if (this.aborted) return;

      await this.withRetry(() => this.stepReconnect(), '重连设备', 3);
      if (this.aborted) return;

      await this.withRetry(() => this.stepGetPageSize(), '查询页大小', MAX_RETRY);
      if (this.aborted) return;

      await this.withRetry(() => this.stepReqUnlock(), '请求解锁', MAX_RETRY);
      if (this.aborted) return;

      await this.withRetry(() => this.stepStartUp(), '开始升级', MAX_RETRY);
      if (this.aborted) return;

      await this.stepWriteFlash();
      if (this.aborted) return;

      await this.stepEndUp();
      if (this.aborted) return;

      await this.stepReset();

      const s = useDfuStore.getState();
      s.markCompleted();
      s.appendLog('===== 固件升级成功！设备即将重启 =====', 'success');
    } catch (err: any) {
      const s = useDfuStore.getState();
      s.setStep('failed', '升级失败');
      s.setError(err.message);
      s.appendLog(`升级失败: ${err.message}`, 'error');
      throw err;
    }
  }

  // ── steps ──

  private async stepConnect(): Promise<void> {
    setStep('connecting', '正在连接设备...');
    await this.manager.connect();
    setStep('get_version', '查询固件版本...');
  }

  private async stepGetVersion(): Promise<void> {
    const payload = buildControlPayload(CTRL_GET_VERSION, true);
    const resp = await this.manager.request(payload, DFU_TIMEOUT_NORMAL);
    const version = parseVersion(resp);
    const store = useDfuStore.getState();
    store.setCurrentVersion(version);
    store.appendLog(`设备当前固件版本: ${version}`, 'info');

    if (version !== 'unknown' && this.firmware.version !== 'unknown') {
      store.appendLog(
        `⚠️ 当前版本 ${version} → 目标版本 ${this.firmware.version}`,
        'warn',
      );
    }
  }

  private async stepCheckInDfu(): Promise<void> {
    setStep('check_in_dfu', '查询 DFU 模式...');
    const payload = buildControlPayload(CTRL_CHECK_IN_DFU, true);
    const resp = await this.manager.request(payload, DFU_TIMEOUT_NORMAL);

    if (resp.length > 0 && (resp[0]! & 0x7f) === CTRL_OK) {
      useDfuStore.getState().appendLog('设备已在 DFU 模式，跳过进入 DFU', 'info');
      setStep('wait_reboot', '等待设备重连...');
      return;
    }

    // Enter DFU
    setStep('enter_dfu', '进入 DFU 模式...');
    const enterPayload = buildControlPayload(CTRL_ENTER_DFU, true);
    await this.manager.request(enterPayload, DFU_TIMEOUT_NORMAL);
    useDfuStore.getState().appendLog('已发送进入 DFU 命令，等待设备重启...', 'info');
    setStep('wait_reboot', '等待设备重启...');

    await this.waitForDisconnect(6000);
  }

  private async stepReconnect(): Promise<void> {
    setStep('scan_reconnect', '正在搜索设备...');
    await delay(1000);
    setStep('connect_reconnect', '正在重新连接...');
    await this.manager.connect();
    useDfuStore.getState().appendLog('DFU 模式重连成功', 'success');
  }

  private async stepGetPageSize(): Promise<void> {
    setStep('get_page_size', '查询 Flash 页大小...');
    const payload = buildControlPayload(CTRL_GET_PAGE_SIZE, true);
    const resp = await this.manager.request(payload, DFU_TIMEOUT_NORMAL);
    this.pageSize = parsePageSize(resp);
    const store = useDfuStore.getState();
    store.setPageSize(this.pageSize);

    // chunk size = (MTU - 3) / 4 * 4
    this.chunkSize = Math.floor((197 - 1) / 4) * 4;
    store.appendLog(
      `Flash 页大小: ${this.pageSize} bytes, 写入块: ${this.chunkSize} bytes`,
      'info',
    );
  }

  private async stepReqUnlock(): Promise<void> {
    setStep('req_unlock', '请求 Flash 解锁...');
    // 使用固件文件前 96 字节作为解锁数据（对齐 APK）
    const unlockData = this.firmware.rawData.slice(0, UNLOCK_BYTES);

    const payload = buildUnlockPayload(unlockData);
    await this.manager.request(payload, DFU_TIMEOUT_NORMAL);
    useDfuStore.getState().appendLog('Flash 已解锁', 'success');
  }

  private async stepStartUp(): Promise<void> {
    setStep('start_up', '准备写入固件...');
    const payload = buildControlPayload(CTRL_START_UP, true);
    await this.manager.request(payload, DFU_TIMEOUT_START_UP);
    useDfuStore.getState().appendLog('开始写入固件...', 'info');
    await delay(300);
  }

  private async stepWriteFlash(): Promise<void> {
    setStep('write_flash', '写入固件数据...');
    // Flash 写入从 FLASH_OFFSET(96) 开始（前 96 字节已用于解锁，对齐 APK）
    const data = this.firmware.rawData;
    const total = data.length - FLASH_OFFSET;
    const store = useDfuStore.getState();
    store.appendLog(
      `固件大小: ${total} bytes (${Math.ceil(total / this.chunkSize)} 个分片)`,
      'info',
    );

    for (let offset = 0; offset < total; offset += this.chunkSize) {
      if (this.aborted) return;

      const end = Math.min(offset + this.chunkSize, total);
      const chunk = data.slice(FLASH_OFFSET + offset, FLASH_OFFSET + end);

      // 对齐到 4 字节并用 0xFF 填充（对齐 APK alignTo4）
      const alignedSize = alignTo4(chunk.length);
      let alignedChunk: Uint8Array;
      if (alignedSize > chunk.length) {
        alignedChunk = new Uint8Array(alignedSize);
        alignedChunk.fill(0xff);
        alignedChunk.set(chunk, 0);
      } else {
        alignedChunk = chunk;
      }

      const writePayload = buildWriteFlashPayload(alignedChunk);
      await this.manager.request(writePayload, DFU_TIMEOUT_NORMAL);

      const pct = Math.round((end / total) * 100);
      store.setFlashProgress(pct);

      if (offset + this.chunkSize < total) {
        await delay(WRITE_FLASH_INTERVAL_MS);
      }
    }

    store.appendLog('固件数据写入完成', 'success');
  }

  private async stepEndUp(): Promise<void> {
    setStep('end_up', '完成升级...');
    const payload = buildControlPayload(CTRL_END_UP, true);
    await this.manager.request(payload, DFU_TIMEOUT_END_UP);
    useDfuStore.getState().appendLog('升级结束确认已发送', 'success');
  }

  private async stepReset(): Promise<void> {
    setStep('reset', '复位设备...');
    const payload = buildControlPayload(CTRL_RESET);
    try {
      await this.manager.request(payload, DFU_TIMEOUT_NORMAL);
    } catch {
      useDfuStore.getState().appendLog('设备已复位（断开连接属正常行为）', 'info');
    }
  }

  // ── helpers ──

  private async withRetry(
    fn: () => Promise<void>,
    label: string,
    maxRetry: number,
  ): Promise<void> {
    for (let attempt = 1; attempt <= maxRetry; attempt++) {
      try {
        await fn();
        return;
      } catch (err: any) {
        if (this.aborted) return;
        const s = useDfuStore.getState();
        if (attempt >= maxRetry) {
          s.appendLog(`${label} 失败，已重试 ${maxRetry} 次: ${err.message}`, 'error');
          throw err;
        }
        s.appendLog(`${label} 失败（第 ${attempt}/${maxRetry} 次），重试中...`, 'warn');
        await delay(500);
      }
    }
  }

  private async waitForDisconnect(timeoutMs: number): Promise<void> {
    const store = useDfuStore.getState();
    store.appendLog(`等待设备断开（最多 ${timeoutMs / 1000}s）...`, 'info');

    const start = performance.now();
    while (this.manager.isConnected && performance.now() - start < timeoutMs) {
      if (this.aborted) return;
      await delay(200);
    }

    if (this.manager.isConnected) {
      store.appendLog('设备未主动断开，强制断开连接...', 'warn');
      await this.manager.disconnect();
    }
  }
}
