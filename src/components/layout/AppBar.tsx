import { useState, useRef, useEffect } from 'react';
import { useBle } from '../../hooks/useBle';
import { useSettingsStore } from '../../stores/settings';
import { StatusPill } from '../ui/StatusPill';

interface AppBarProps {
  onMenuClick: () => void;
}

export function AppBar({ onMenuClick }: AppBarProps) {
  const { state, deviceName, profile, isConnected, isVirtualDevice, connectReal, connectVirtual, disconnect } = useBle();
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  return (
    <header
      style={{
        height: '52px',
        background: 'var(--color-bg-inset)',
        borderBottom: '0.5px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: '16px',
        flexShrink: 0,
      }}
    >
      <button
        onClick={onMenuClick}
        aria-label="打开菜单"
        className="menu-toggle"
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--color-text-muted)',
          cursor: 'pointer',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '4px',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 6h18M3 12h18M3 18h18" />
        </svg>
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.5">
          <circle cx="12" cy="12" r="2.5" />
          <path d="M12 9.5V4M12 14.5V20M9.5 12H4M14.5 12H20M10.3 10.3L6.5 6.5M13.7 13.7L17.5 17.5M13.7 10.3L17.5 6.5M10.3 13.7L6.5 17.5" />
        </svg>
        <span style={{ fontWeight: 500, fontSize: '14px', letterSpacing: '0.5px' }}>
          W96P · 控制
        </span>
      </div>

      <div style={{ flex: 1 }} />

      {isConnected && deviceName && (
        <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>
          {deviceName}
          {profile && ` · ${profile.name}`}
          {isVirtualDevice && <span style={{ color: 'var(--color-warning)', marginLeft: '4px' }}>[虚拟]</span>}
        </span>
      )}

      {isConnected ? (
        <StatusPill status={isVirtualDevice ? 'warning' : 'success'} label={isVirtualDevice ? '虚拟已连接' : '已连接'} />
      ) : state === 'connecting' ? (
        <StatusPill status="warning" label="连接中" />
      ) : (
        <StatusPill status="default" label="未连接" />
      )}

      {isConnected ? (
        <button onClick={disconnect} style={disconnectBtnStyle}>
          断开
        </button>
      ) : (
        <div ref={menuRef} style={{ position: 'relative' }}>
          <button onClick={() => setMenuOpen(!menuOpen)} style={connectBtnStyle}>
            连接 ▾
          </button>
          {menuOpen && (
            <div style={menuStyle}>
              <button
                onClick={() => { setMenuOpen(false); connectReal(); }}
                style={menuItemStyle}
              >
                连接真机
              </button>
              <div style={{ height: '0.5px', background: 'var(--color-border)', margin: '4px 0' }} />
              <div style={{ padding: '4px 10px', fontSize: '10px', color: 'var(--color-text-dim)', letterSpacing: '0.5px' }}>
                虚拟设备
              </div>
              <button
                onClick={() => { setMenuOpen(false); connectVirtual('W96P'); }}
                style={menuItemStyle}
              >
                虚拟 W96P（0-100）
              </button>
              <button
                onClick={() => { setMenuOpen(false); connectVirtual('W66D'); }}
                style={menuItemStyle}
              >
                虚拟 W66D（20-90）
              </button>
            </div>
          )}
        </div>
      )}

      <button
        onClick={toggleTheme}
        aria-label="切换主题"
        style={{
          background: 'transparent',
          border: '0.5px solid var(--color-border-strong)',
          borderRadius: '6px',
          padding: '6px 8px',
          color: 'var(--color-text-muted)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {theme === 'dark' ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        )}
      </button>
    </header>
  );
}

const connectBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: '0.5px solid var(--color-border-strong)',
  borderRadius: '6px',
  padding: '6px 12px',
  color: 'var(--color-accent)',
  fontSize: '12px',
  fontFamily: 'var(--font-sans)',
  cursor: 'pointer',
};

const disconnectBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: '0.5px solid var(--color-border-strong)',
  borderRadius: '6px',
  padding: '6px 12px',
  color: 'var(--color-danger)',
  fontSize: '12px',
  fontFamily: 'var(--font-sans)',
  cursor: 'pointer',
};

const menuItemStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  background: 'transparent',
  border: 'none',
  borderRadius: '4px',
  padding: '8px 10px',
  color: 'var(--color-text)',
  fontSize: '12px',
  fontFamily: 'var(--font-sans)',
  cursor: 'pointer',
  textAlign: 'left',
};

const menuStyle: React.CSSProperties = {
  position: 'absolute',
  top: '100%',
  right: 0,
  marginTop: '4px',
  background: 'var(--color-bg-surface)',
  border: '0.5px solid var(--color-border)',
  borderRadius: '6px',
  padding: '4px',
  minWidth: '160px',
  zIndex: 100,
  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
};
