import { useEffect } from 'react';
import { useBle } from './useBle';
import { useSettingsStore } from '../stores/settings';

export function usePolling(): void {
  const { isConnected, startPolling, stopPolling } = useBle();
  const pollInterval = useSettingsStore((s) => s.pollIntervalMs);

  useEffect(() => {
    if (!isConnected) return;
    startPolling();
    return stopPolling;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, pollInterval]);

  useEffect(() => {
    const onVis = () => {
      if (document.hidden) stopPolling();
      else if (isConnected) startPolling();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, pollInterval]);
}
