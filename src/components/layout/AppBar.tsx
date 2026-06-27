import { useBle } from '../../hooks/useBle';
import { useSettingsStore } from '../../stores/settings';
import { StatusPill } from '../ui/StatusPill';

export function AppBar() {
  const { state, deviceName, profile, isConnected, connect, disconnect } = useBle();
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

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
        </span>
      )}

      {isConnected ? (
        <StatusPill status="success" label="已连接" />
      ) : state === 'connecting' ? (
        <StatusPill status="warning" label="连接中" />
      ) : (
        <StatusPill status="default" label="未连接" />
      )}

      <button
        onClick={isConnected ? disconnect : connect}
        style={{
          background: 'transparent',
          border: '0.5px solid var(--color-border-strong)',
          borderRadius: '6px',
          padding: '6px 12px',
          color: isConnected ? 'var(--color-danger)' : 'var(--color-accent)',
          fontSize: '12px',
          fontFamily: 'var(--font-sans)',
          cursor: 'pointer',
        }}
      >
        {isConnected ? '断开' : '连接'}
      </button>

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
