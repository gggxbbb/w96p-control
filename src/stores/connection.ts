import { create } from 'zustand';
import type { BleState } from '../ble/manager';
import type { Profile } from '../ble/profiles';

interface ConnectionState {
  state: BleState;
  deviceName: string | null;
  profile: Profile | null;
  lastError: string | null;
  connectedAt: number | null;
  setConnecting: () => void;
  setConnected: (name: string, profile: Profile) => void;
  setError: (msg: string) => void;
  setDisconnected: () => void;
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  state: 'idle',
  deviceName: null,
  profile: null,
  lastError: null,
  connectedAt: null,
  setConnecting: () => set({ state: 'connecting', lastError: null }),
  setConnected: (name, profile) =>
    set({ state: 'connected', deviceName: name, profile, connectedAt: Date.now(), lastError: null }),
  setError: (msg) => set({ state: 'error', lastError: msg }),
  setDisconnected: () =>
    set({ state: 'idle', deviceName: null, profile: null, connectedAt: null }),
}));
