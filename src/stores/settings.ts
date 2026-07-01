import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const DASHBOARD_CARD_KEYS = [
  'fan-gear', 'fan-speed',
  'batt-power', 'batt-cur', 'batt-volt', 'batt-cap',
  'motor-power', 'motor-cur', 'motor-volt',
  'vbus-power', 'vbus-cur', 'vbus-volt',
  'pow-core-temp',
] as const;

export type DashboardCardKey = typeof DASHBOARD_CARD_KEYS[number];

export const DASHBOARD_CARD_LABELS: Record<DashboardCardKey, string> = {
  'fan-speed': '转速',
  'batt-power': '电池功率',
  'motor-power': '电机功率',
  'motor-cur': '电机电流',
  'batt-volt': '电池电压',
  'vbus-volt': 'VBUS 电压',
  'motor-volt': '电机电压',
  'batt-cur': '电池电流',
  'batt-cap': '电池容量',
  'vbus-cur': 'VBUS 电流',
  'vbus-power': 'VBUS 功率',
  'fan-gear': '档位',
  'pow-core-temp': '芯片温度',
};

export const DASHBOARD_CARD_DEFAULTS: DashboardCardKey[] = [
  'fan-gear', 'fan-speed', 'batt-power', 'motor-power', 'vbus-power',
];

export type DashboardCards = Record<DashboardCardKey, boolean>;

interface SettingsState {
  theme: 'dark' | 'light';
  pollIntervalMs: number;
  curveEditorMode: 'canvas' | 'textarea';
  historyRetentionMin: number;
  lastDeviceName: string | null;
  dashboardCards: DashboardCards;
  setTheme: (t: 'dark' | 'light') => void;
  setPollInterval: (ms: number) => void;
  setCurveMode: (m: 'canvas' | 'textarea') => void;
  setHistoryRetentionMin: (min: number) => void;
  setLastDeviceName: (name: string | null) => void;
  setDashboardCards: (cards: DashboardCards) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'dark',
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
    { name: 'w96p-settings' },
  ),
);
