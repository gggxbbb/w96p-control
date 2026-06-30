import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { useSettingsStore } from './stores/settings';
import 'react-grid-layout/css/styles.css';
import './styles.css';

const theme = useSettingsStore.getState().theme;
document.documentElement.dataset.theme = theme;

const rootEl = document.getElementById('root')!;

// 同步快路径：浏览器完全没有 Web Bluetooth API — 跳过 Router/所有 lazy chunk
if (!navigator.bluetooth) {
  const IncompatibleScreen = lazy(() => import('./components/IncompatibleScreen').then((m) => ({ default: m.IncompatibleScreen })));
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
