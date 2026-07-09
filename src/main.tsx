import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { useSettingsStore, resolveTheme } from './stores/settings';
import { isBlacklisted } from './lib/browserBlacklist';
import 'react-grid-layout/css/styles.css';
import './styles.css';

const theme = resolveTheme(useSettingsStore.getState().theme);
document.documentElement.dataset.theme = theme;

const rootEl = document.getElementById('root')!;
const blacklisted = isBlacklisted();

// 同步快路径：内置浏览器 WebView 或没有 Web Bluetooth API → 跳过全量 App 加载
if (blacklisted || !navigator.bluetooth) {
  const reason = blacklisted
    ? '当前浏览器为内置浏览器（如微信 / QQ 等），WebView 内核功能受限，不支持 Web Bluetooth。请使用系统自带浏览器打开此页面。'
    : undefined;

  const IncompatibleScreen = lazy(async () => {
    const m = await import('./components/IncompatibleScreen');
    return { default: () => <m.IncompatibleScreen reason={reason} /> };
  });

  createRoot(rootEl).render(
    <StrictMode>
      <Suspense fallback={null}>
        <IncompatibleScreen />
      </Suspense>
    </StrictMode>,
  );
} else {
  // 正常路径：API 存在，异步检查 getAvailability
  const App = lazy(() => import('./components/AppRoot'));
  createRoot(rootEl).render(
    <StrictMode>
      <Suspense fallback={null}>
        <App />
      </Suspense>
    </StrictMode>,
  );
}
