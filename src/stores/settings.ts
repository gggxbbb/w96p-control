import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  theme: 'dark' | 'light';
  pollIntervalMs: number;
  curveEditorMode: 'canvas' | 'textarea';
  historyRetentionMin: number;
  lastDeviceName: string | null;
  setTheme: (t: 'dark' | 'light') => void;
  setPollInterval: (ms: number) => void;
  setCurveMode: (m: 'canvas' | 'textarea') => void;
  setHistoryRetentionMin: (min: number) => void;
  setLastDeviceName: (name: string | null) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'dark',
      pollIntervalMs: 1000,
      curveEditorMode: 'canvas',
      historyRetentionMin: 30,
      lastDeviceName: null,
      setTheme: (t) => set({ theme: t }),
      setPollInterval: (ms) => set({ pollIntervalMs: ms }),
      setCurveMode: (m) => set({ curveEditorMode: m }),
      setHistoryRetentionMin: (min) => set({ historyRetentionMin: min }),
      setLastDeviceName: (name) => set({ lastDeviceName: name }),
    }),
    { name: 'w96p-settings' },
  ),
);
