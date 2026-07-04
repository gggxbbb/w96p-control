import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from '../app/router';
import { BrowserGate } from './BrowserGate';
import { UpdatePrompt } from './UpdatePrompt';
import { DeviceCard } from './connection/DeviceCard';
import { useBle } from '../hooks/useBle';
import { useConnectionStore } from '../stores/connection';

export default function AppRoot() {
  const { isConnected } = useBle();
  const state = useConnectionStore((s) => s.state);

  // 主题同步
  useEffect(() => {
    const handleTheme = () => {
      document.documentElement.dataset.theme =
        document.documentElement.dataset.theme === 'light' ? 'dark' : 'dark';
    };
    // 从 localStorage 读初始主题
    try {
      const raw = localStorage.getItem('w96p-settings');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.state?.theme) {
          document.documentElement.dataset.theme = parsed.state.theme;
        }
      }
    } catch {
      // ignore
    }
    window.addEventListener('themechange', handleTheme);
    return () => window.removeEventListener('themechange', handleTheme);
  }, []);

  return (
    <BrowserGate>
      <RouterProvider router={router} />
      <UpdatePrompt />
      {/* 连接弹窗：未连接时显示 */}
      <DeviceCard open={state !== 'connected'} />
    </BrowserGate>
  );
}
