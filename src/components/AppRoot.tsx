import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from '../app/router';
import { useSettingsStore, resolveTheme } from '../stores/settings';
import { BrowserGate } from './BrowserGate';
import { UpdatePrompt } from './UpdatePrompt';

export default function AppRoot() {
  const theme = useSettingsStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.dataset.theme = resolveTheme(theme);

    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      document.documentElement.dataset.theme = resolveTheme('system');
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  return (
    <BrowserGate>
      <RouterProvider router={router} />
      <UpdatePrompt />
    </BrowserGate>
  );
}
