import { useEffect, useState } from 'react';
import { useConnectionStore } from '../../stores/connection';
import { useSettingsStore } from '../../stores/settings';

export function StatusBar() {
  const { state, profile } = useConnectionStore();
  const pollInterval = useSettingsStore((s) => s.pollIntervalMs);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const timeStr = now.toLocaleTimeString('zh-CN', { hour12: false });

  const statusColor =
    state === 'connected' ? 'var(--color-success)' :
    state === 'connecting' ? 'var(--color-warning)' :
    state === 'error' ? 'var(--color-danger)' :
    'var(--color-text-dim)';

  return (
    <footer
      style={{
        height: '24px',
        background: 'var(--color-bg-inset)',
        borderTop: '0.5px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 14px',
        gap: '16px',
        fontSize: '10px',
        color: 'var(--color-text-muted)',
        fontFamily: 'var(--font-sans)',
        fontVariantNumeric: 'tabular-nums',
        flexShrink: 0,
      }}
    >
      <span style={{ color: statusColor }}>{state === 'connected' ? '●' : state === 'connecting' ? '●' : state === 'error' ? '●' : '●'}</span>
      {state === 'connected' && <span className="status-label">就绪</span>}
      {state === 'connecting' && <span className="status-label">连接中</span>}
      {state === 'error' && <span className="status-label">错误</span>}
      {state !== 'connected' && state !== 'connecting' && state !== 'error' && <span className="status-label">空闲</span>}
      <span style={{ color: 'var(--color-text-dim)' }}>|</span>
      <span className="status-label">{pollInterval}ms</span>
      {profile && (
        <>
          <span style={{ color: 'var(--color-text-dim)' }}>|</span>
          <span className="status-label">{profile.name}</span>
        </>
      )}
      <div style={{ flex: 1 }} />
      <span style={{ color: 'var(--color-text-dim)' }}>{timeStr} GMT+8</span>
    </footer>
  );
}
