import { create } from 'zustand';

interface ToastState {
  msg: string | null;
  show: (m: string) => void;
  clear: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  msg: null,
  show: (m) => set({ msg: m }),
  clear: () => set({ msg: null }),
}));
