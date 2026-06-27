import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { ConnGuard } from '../components/connection/ConnGuard';

const Dashboard = lazy(() => import('../pages/dashboard'));
const Fan = lazy(() => import('../pages/fan'));
const NatureWind = lazy(() => import('../pages/nature-wind'));
const Power = lazy(() => import('../pages/power'));
const PowerConfig = lazy(() => import('../pages/power-config'));
const History = lazy(() => import('../pages/history'));
const Settings = lazy(() => import('../pages/settings'));

function Loading() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px', color: 'var(--color-text-muted)', fontSize: '13px' }}>
      加载中...
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Suspense fallback={<Loading />}><Dashboard /></Suspense> },
      { path: 'fan', element: <Suspense fallback={<Loading />}><ConnGuard><Fan /></ConnGuard></Suspense> },
      { path: 'nature-wind', element: <Suspense fallback={<Loading />}><ConnGuard><NatureWind /></ConnGuard></Suspense> },
      { path: 'power', element: <Suspense fallback={<Loading />}><ConnGuard><Power /></ConnGuard></Suspense> },
      { path: 'power-config', element: <Suspense fallback={<Loading />}><ConnGuard><PowerConfig /></ConnGuard></Suspense> },
      { path: 'history', element: <Suspense fallback={<Loading />}><ConnGuard><History /></ConnGuard></Suspense> },
      { path: 'settings', element: <Suspense fallback={<Loading />}><Settings /></Suspense> },
    ],
  },
]);
