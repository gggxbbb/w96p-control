import { create } from 'zustand';

export interface MetricConfig {
  variant: 'number' | 'gauge';
  min?: number;
  max?: number;
}

interface MetricCardStore {
  configs: Record<string, MetricConfig>;
  setVariant: (key: string, variant: 'number' | 'gauge') => void;
  setRange: (key: string, min: number, max: number) => void;
  getConfig: (key: string) => MetricConfig;
}

export const useMetricStore = create<MetricCardStore>((set, get) => ({
  configs: {},
  setVariant: (key, variant) =>
    set((s) => ({
      configs: { ...s.configs, [key]: { ...s.configs[key], variant } },
    })),
  setRange: (key, min, max) =>
    set((s) => ({
      configs: { ...s.configs, [key]: { ...s.configs[key], min, max } },
    })),
  getConfig: (key) => {
    const cfg = get().configs[key];
    return cfg ?? { variant: 'number' };
  },
}));
