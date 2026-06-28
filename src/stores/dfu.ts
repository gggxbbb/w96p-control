import { create } from 'zustand';

export type DfuStep =
  | 'idle'
  | 'connecting'
  | 'get_version'
  | 'check_in_dfu'
  | 'enter_dfu'
  | 'wait_reboot'
  | 'scan_reconnect'
  | 'connect_reconnect'
  | 'get_page_size'
  | 'req_unlock'
  | 'start_up'
  | 'write_flash'
  | 'end_up'
  | 'reset'
  | 'success'
  | 'failed';

export interface DfuLogEntry {
  time: string;
  message: string;
  level: 'info' | 'warn' | 'error' | 'success';
}

export interface DfuState {
  /** 当前步骤 */
  step: DfuStep;
  /** 当前步骤的详细描述 */
  stepLabel: string;
  /** 固件刷写进度 (0-100) */
  flashProgress: number;
  /** 设备当前固件版本 */
  currentVersion: string;
  /** 待升级固件版本 */
  targetVersion: string;
  /** Flash 页大小（从设备查询） */
  pageSize: number;
  /** 严重错误信息 */
  error: string | null;
  /** 日志条目（最多保留 200 条） */
  logs: DfuLogEntry[];
  /** 升级是否正在进行中 */
  inProgress: boolean;
  /** 升级是否已完成（成功） */
  completed: boolean;

  // Actions
  setStep: (step: DfuStep, label: string) => void;
  setFlashProgress: (pct: number) => void;
  setCurrentVersion: (v: string) => void;
  setTargetVersion: (v: string) => void;
  setPageSize: (size: number) => void;
  setError: (err: string | null) => void;
  appendLog: (message: string, level?: DfuLogEntry['level']) => void;
  startUpgrade: (targetVersion: string) => void;
  markCompleted: () => void;
  reset: () => void;
}

function formatTime(): string {
  return new Date().toLocaleTimeString('zh-CN', { hour12: false });
}

const initialState = {
  step: 'idle' as DfuStep,
  stepLabel: '等待开始',
  flashProgress: 0,
  currentVersion: '',
  targetVersion: '',
  pageSize: 0,
  error: null,
  logs: [] as DfuLogEntry[],
  inProgress: false,
  completed: false,
};

export const useDfuStore = create<DfuState>((set) => ({
  ...initialState,

  setStep: (step, label) => set({ step, stepLabel: label }),

  setFlashProgress: (pct) => set({ flashProgress: Math.max(0, Math.min(100, Math.round(pct))) }),

  setCurrentVersion: (v) => set({ currentVersion: v }),

  setTargetVersion: (v) => set({ targetVersion: v }),

  setPageSize: (size) => set({ pageSize: size }),

  setError: (err) => set({ error: err }),

  appendLog: (message, level = 'info') =>
    set((s) => ({
      logs: [...s.logs.slice(-199), { time: formatTime(), message, level }],
    })),

  startUpgrade: (targetVersion) =>
    set({
      ...initialState,
      targetVersion,
      inProgress: true,
      step: 'connecting',
      stepLabel: '正在连接设备...',
    }),

  markCompleted: () =>
    set({
      step: 'success',
      stepLabel: '升级完成',
      flashProgress: 100,
      inProgress: false,
      completed: true,
    }),

  reset: () => set(initialState),
}));
