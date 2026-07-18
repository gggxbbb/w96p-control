/**
 * 设备会话
 *
 * 持有一个 IBleManager（真机 BleManager 或 VirtualManager），负责
 * 连接生命周期、轮询调度与快照缓存。TUI 与 MCP server 共用此层。
 */

import type { IBleManager, BleSnapshot, BleState } from '@gggxbbb/w96p-ble-sdk';

/** 会话连接状态（TUI 状态面板与 MCP 工具共用） */
export interface SessionState {
  state: BleState;
  deviceName?: string;
  isCompat: boolean;
  connected: boolean;
}

type SnapshotListener = (snap: BleSnapshot) => void;
type StateListener = (s: SessionState) => void;
type ErrorListener = (msg: string) => void;

export class DeviceSession {
  private manager: IBleManager | null = null;
  private _snapshot: BleSnapshot = {};
  private _state: BleState = 'idle';
  private _deviceName: string | undefined;
  private _isCompat = false;

  private readonly snapshotListeners = new Set<SnapshotListener>();
  private readonly stateListeners = new Set<StateListener>();
  private readonly errorListeners = new Set<ErrorListener>();

  private readonly pollMs: number;

  constructor(pollMs = 500) {
    this.pollMs = pollMs;
  }

  get snapshot(): BleSnapshot {
    return this._snapshot;
  }

  get sessionState(): SessionState {
    return {
      state: this._state,
      deviceName: this._deviceName,
      isCompat: this._isCompat,
      connected: this._state === 'connected',
    };
  }

  /** 当前管理器；未连接时抛错（命令层守卫用） */
  requireManager(): IBleManager {
    if (!this.manager) throw new Error('未连接设备，请先 connect');
    return this.manager;
  }

  onSnapshot(fn: SnapshotListener): () => void {
    this.snapshotListeners.add(fn);
    return () => {
      this.snapshotListeners.delete(fn);
    };
  }

  onState(fn: StateListener): () => void {
    this.stateListeners.add(fn);
    return () => {
      this.stateListeners.delete(fn);
    };
  }

  onError(fn: ErrorListener): () => void {
    this.errorListeners.add(fn);
    return () => {
      this.errorListeners.delete(fn);
    };
  }

  private emitState(): void {
    const s = this.sessionState;
    for (const fn of this.stateListeners) fn(s);
  }

  /** 接入一个管理器并建立连接，成功后按 pollMs 开始轮询 */
  async connect(manager: IBleManager): Promise<void> {
    if (this.manager) throw new Error('已有进行中的连接，请先 disconnect');
    this.manager = manager;
    manager.onSnapshot = (partial) => {
      this._snapshot = { ...this._snapshot, ...partial };
      for (const fn of this.snapshotListeners) fn(this._snapshot);
    };
    manager.onState = (state, deviceName, isCompat) => {
      this._state = state;
      if (deviceName !== undefined) this._deviceName = deviceName;
      if (isCompat !== undefined) this._isCompat = isCompat;
      this.emitState();
    };
    manager.onError = (msg) => {
      for (const fn of this.errorListeners) fn(msg);
    };
    try {
      await manager.connect();
      // BleManager.connect 失败时不抛异常（内部 catch 后发 'error' 状态就 resolve），
      // 必须显式断言状态，否则会在无特征表的情况下启动轮询 → readValue 空指针刷屏
      if (this._state !== 'connected') {
        throw new Error('连接失败（详见上方设备错误）');
      }
      manager.startPolling(this.pollMs);
    } catch (e) {
      this.detach();
      throw e;
    }
  }

  disconnect(): void {
    const m = this.manager;
    if (!m) return;
    m.stopPolling();
    m.disconnect();
    this.detach();
  }

  private detach(): void {
    const m = this.manager;
    if (m) {
      m.onSnapshot = undefined;
      m.onState = undefined;
      m.onError = undefined;
    }
    this.manager = null;
    this._state = 'idle';
    this._deviceName = undefined;
    this._isCompat = false;
    this.emitState();
  }
}
