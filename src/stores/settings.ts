import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const DASHBOARD_CARD_KEYS = [
  'fan-gear', 'fan-speed', 'fan-timer',
  'batt-power', 'batt-cur', 'batt-volt', 'batt-cap',
  'motor-power', 'motor-cur', 'motor-volt',
  'vbus-power', 'vbus-cur', 'vbus-volt',
  'pow-level', 'pow-core-temp',
  'batt-est-pct',
  'batt-est-rem',
  'batt-est-eta',
  'pow-level-rem',
  'pow-level-eta',
  'turbo-countdown',
] as const;

export type DashboardCardKey = typeof DASHBOARD_CARD_KEYS[number];
export const DASHBOARD_CARD_LABELS: Record<DashboardCardKey, string> = {
  'fan-gear': '档位',
  'fan-speed': '转速',
  'fan-timer': '定时',
  'batt-power': '电池功率',
  'batt-cur': '电池电流',
  'batt-volt': '电池电压',
  'batt-cap': '电池容量',
  'motor-power': '电机功率',
  'motor-cur': '电机电流',
  'motor-volt': '电机电压',
  'vbus-power': 'VBUS 功率',
  'vbus-cur': 'VBUS 电流',
  'vbus-volt': 'VBUS 电压',
  'pow-level': '电量',
  'pow-core-temp': '芯片温度',
  'batt-est-pct': '电量(电压估算)',
  'batt-est-rem': '剩余容量(估算)',
  'batt-est-eta': '预计续航(估算)',
  'pow-level-rem': '剩余容量(芯片)',
  'pow-level-eta': '预计续航(芯片)',
  'turbo-countdown': 'Turbo 倒计时',
};

export const DASHBOARD_CARD_DEFAULTS: DashboardCardKey[] = [
  'fan-gear', 'fan-speed', 'batt-power', 'motor-power', 'vbus-power', 'batt-est-pct',
];

export type DashboardCards = Record<DashboardCardKey, boolean>;

export type Theme = 'light' | 'dark' | 'system';
export type PollInterval = 500 | 1000 | 2000;
export type HistoryRetention = 15 | 30 | 60;

export function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme !== 'system') return theme;
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

interface SettingsState {
  theme: Theme;
  pollIntervalMs: PollInterval;
  curveEditorMode: 'canvas' | 'textarea';
  historyRetentionMin: HistoryRetention;
  lastDeviceName: string | null;
  dashboardCards: DashboardCards;
  setTheme: (t: Theme) => void;
  setPollInterval: (ms: PollInterval) => void;
  setCurveMode: (m: 'canvas' | 'textarea') => void;
  setHistoryRetentionMin: (min: HistoryRetention) => void;
  setLastDeviceName: (name: string | null) => void;
  setDashboardCards: (cards: DashboardCards) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      pollIntervalMs: 500,
      curveEditorMode: 'canvas',
      historyRetentionMin: 30,
      lastDeviceName: null,
      dashboardCards: Object.fromEntries(
        DASHBOARD_CARD_KEYS.map((k) => [k, DASHBOARD_CARD_DEFAULTS.includes(k)]),
      ) as DashboardCards,
      setTheme: (t) => set({ theme: t }),
      setPollInterval: (ms) => set({ pollIntervalMs: ms }),
      setCurveMode: (m) => set({ curveEditorMode: m }),
      setHistoryRetentionMin: (min) => set({ historyRetentionMin: min }),
      setLastDeviceName: (name) => set({ lastDeviceName: name }),
      setDashboardCards: (cards) => set({ dashboardCards: cards }),
    }),
    {
      name: 'w96p-settings',
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const validPoll: PollInterval[] = [500, 1000, 2000];
        const validRetention: HistoryRetention[] = [15, 30, 60];
        if (!validPoll.includes(state.pollIntervalMs)) state.pollIntervalMs = 500;
        if (!validRetention.includes(state.historyRetentionMin)) state.historyRetentionMin = 30;
      },
    },
  ),
);
