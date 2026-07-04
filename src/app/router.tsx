import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';

const HomePage = lazy(() => import('../pages/home'));
const PowerPage = lazy(() => import('../pages/power-v2'));
const NatureWindPage = lazy(() => import('../pages/nature-wind-v2'));
const BatteryLearnPage = lazy(() => import('../pages/battery-learn'));
const DebugBlePage = lazy(() => import('../pages/debug-ble'));

function Loading() {
  return (
    <div className="page-loading">
      <span className="page-spinner" />
      <span>加载中…</span>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<Loading />}>
            <HomePage />
          </Suspense>
        ),
      },
      {
        path: 'power',
        element: (
          <Suspense fallback={<Loading />}>
            <PowerPage />
          </Suspense>
        ),
      },
      {
        path: 'nature-wind',
        element: (
          <Suspense fallback={<Loading />}>
            <NatureWindPage />
          </Suspense>
        ),
      },
      {
        path: 'battery-learn',
        element: (
          <Suspense fallback={<Loading />}>
            <BatteryLearnPage />
          </Suspense>
        ),
      },
      {
        path: 'debug/ble',
        element: (
          <Suspense fallback={<Loading />}>
            <DebugBlePage />
          </Suspense>
        ),
      },
    ],
  },
]);
