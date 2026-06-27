import { Outlet } from 'react-router-dom';
import { AppBar } from './AppBar';
import { SideNav } from './SideNav';
import { StatusBar } from './StatusBar';
import { BottomNav } from './BottomNav';
import { Toast } from '../ui/Toast';
import { usePolling } from '../../hooks/usePolling';

export function AppLayout() {
  usePolling();
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--color-bg-page)',
        color: 'var(--color-text)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      <AppBar />
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <SideNav />
        <main
          style={{
            flex: 1,
            minWidth: 0,
            padding: '16px',
            overflow: 'auto',
          }}
        >
          <Outlet />
        </main>
      </div>
      <StatusBar />
      <BottomNav />
      <Toast />
    </div>
  );
}
