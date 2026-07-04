import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from '../app/router';
import { BrowserGate } from './BrowserGate';
import { UpdatePrompt } from './UpdatePrompt';
import { DeviceCard } from './connection/DeviceCard';
import { useConnectionStore } from '../stores/connection';
import { useSettingsStore } from '../stores/settings';

export default function AppRoot() {
  const state = useConnectionStore((s) => s.state);
  const theme = useSettingsStore((s) => s.theme);

  // 主题同步：Zustand store 变化 → DOM 属性同步
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <BrowserGate>
      <RouterProvider router={router} />
      <UpdatePrompt />
      {/* 连接弹窗：未连接时显示 */}
      <DeviceCard open={state !== 'connected'} />
    </BrowserGate>
  );
}
