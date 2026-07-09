import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { ConnGuard } from '../components/connection/ConnGuard';

const Dashboard = lazy(() => import('../pages/dashboard'));
const Advanced = lazy(() => import('../pages/advanced'));
const Fan = lazy(() => import('../pages/fan'));
const NatureWind = lazy(() => import('../pages/nature-wind'));
const Power = lazy(() => import('../pages/power'));
const PowerConfig = lazy(() => import('../pages/power-config'));
const History = lazy(() => import('../pages/history'));
const Settings = lazy(() => import('../pages/settings'));
const Ota = lazy(() => import('../pages/ota'));
const DebugBle = lazy(() => import('../pages/debug-ble'));
const BatteryLearn = lazy(() => import('../pages/battery-learn'));

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
    element: <AppLayout />,
    children: [
      { index: true, element: <Suspense fallback={<Loading />}><Dashboard /></Suspense> },
      { path: 'advanced', element: <Suspense fallback={<Loading />}><ConnGuard><Advanced /></ConnGuard></Suspense> },
      { path: 'fan', element: <Suspense fallback={<Loading />}><ConnGuard><Fan /></ConnGuard></Suspense> },
      { path: 'nature-wind', element: <Suspense fallback={<Loading />}><ConnGuard><NatureWind /></ConnGuard></Suspense> },
      { path: 'power', element: <Suspense fallback={<Loading />}><ConnGuard><Power /></ConnGuard></Suspense> },
      { path: 'power-config', element: <Suspense fallback={<Loading />}><ConnGuard><PowerConfig /></ConnGuard></Suspense> },
      { path: 'ota', element: <Suspense fallback={<Loading />}><ConnGuard><Ota /></ConnGuard></Suspense> },
      { path: 'history', element: <Suspense fallback={<Loading />}><ConnGuard><History /></ConnGuard></Suspense> },
      { path: 'settings', element: <Suspense fallback={<Loading />}><Settings /></Suspense> },
      { path: 'debug/ble', element: <Suspense fallback={<Loading />}><DebugBle /></Suspense> },
      { path: 'battery-learn', element: <Suspense fallback={<Loading />}><BatteryLearn /></Suspense> },
    ],
  },
]);
