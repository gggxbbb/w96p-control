import { create } from 'zustand';
import type { BleState } from '@gggxbbb/w96p-ble-sdk';

interface ConnectionState {
  state: BleState;
  deviceName: string | null;
  isCompatMode: boolean;
  lastError: string | null;
  connectedAt: number | null;
  setConnecting: () => void;
  setConnected: (name: string, isCompat: boolean) => void;
  setError: (msg: string) => void;
  setDisconnected: () => void;
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  state: 'idle',
  deviceName: null,
  isCompatMode: false,
  lastError: null,
  connectedAt: null,
  setConnecting: () => set({ state: 'connecting', lastError: null }),
  setConnected: (name, isCompatMode) =>
    set({ state: 'connected', deviceName: name, isCompatMode, connectedAt: Date.now(), lastError: null }),
  setError: (msg) => set({ state: 'error', lastError: msg }),
  setDisconnected: () =>
    set({ state: 'idle', deviceName: null, isCompatMode: false, connectedAt: null }),
}));
