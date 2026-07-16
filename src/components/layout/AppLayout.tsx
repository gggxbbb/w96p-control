import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AppBar } from './AppBar';
import { SideNav } from './SideNav';
import { StatusBar } from './StatusBar';
import { Drawer } from './Drawer';
import { Toast } from '../ui/Toast';
import { usePolling } from '../../hooks/usePolling';

export function AppLayout() {
  usePolling();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const isEasy = location.pathname === '/easy' || location.pathname === '/';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--color-bg-page)',
        color: 'var(--color-text)',
        fontFamily: 'var(--font-sans)',
        overflow: 'hidden',
      }}
    >
      <AppBar onMenuClick={() => setDrawerOpen(true)} />
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {!isEasy && <SideNav />}
        <main
          style={{
            flex: 1,
            minWidth: 0,
            padding: isEasy ? 0 : '16px',
            overflowY: 'auto',
            overflowX: 'hidden',
          }}
        >
          <Outlet />
        </main>
      </div>
      <StatusBar />
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <Toast />
    </div>
  );
}
