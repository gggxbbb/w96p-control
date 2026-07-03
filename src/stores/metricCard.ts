import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Variant = 'number' | 'gauge';

interface MetricCardState {
  variants: Record<string, Variant>;
  setVariant: (key: string, v: Variant) => void;
}

export const useMetricCardStore = create<MetricCardState>()(
  persist(
    (set) => ({
      variants: {},
      setVariant: (key, v) => set((s) => ({ variants: { ...s.variants, [key]: v } })),
    }),
    { name: 'metric-card-variants' },
  ),
);
