import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { useConnectionStore } from '../../stores/connection';
import { useSettingsStore } from '../../stores/settings';
import { useBleMetrics } from '../../stores/bleMetrics';

const DebugBle = lazy(() => import('../../pages/debug-ble'));
const BatteryLearn = lazy(() => import('../../pages/battery-learn'));

function sep() {
  return <span style={{ color: 'var(--color-text-dim)', flexShrink: 0, opacity: 0.4 }}>|</span>;
}

export function StatusBar() {
  const { state, profile } = useConnectionStore();
  const pollInterval = useSettingsStore((s) => s.pollIntervalMs);
  const metrics = useBleMetrics();
  const schedState = metrics.schedulerState;
  const [now, setNow] = useState(() => new Date());
  const [debugOpen, setDebugOpen] = useState(false);
  const [learnOpen, setLearnOpen] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const closeOnEsc = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') setDebugOpen(false);
  }, []);

  useEffect(() => {
    if (debugOpen) {
      document.addEventListener('keydown', closeOnEsc);
      return () => document.removeEventListener('keydown', closeOnEsc);
    }
  }, [debugOpen, closeOnEsc]);

  const timeStr = now.toLocaleTimeString('zh-CN', { hour12: false });

  const statusColor =
    state === 'connected' ? 'var(--color-success)' :
    state === 'connecting' ? 'var(--color-warning)' :
    state === 'error' ? 'var(--color-danger)' :
    'var(--color-text-dim)';

  const recent = metrics.ops.slice(-20);
  const wOps = recent.filter(o => o.type === 'write' && !o.error);
  const rOps = recent.filter(o => (o.type === 'read' || o.type === 'poll') && !o.error);
  const avgW = wOps.length > 0 ? Math.round(wOps.reduce((a, b) => a + b.duration, 0) / wOps.length) : 0;
  const avgR = rOps.length > 0 ? Math.round(rOps.reduce((a, b) => a + b.duration, 0) / rOps.length) : 0;

  const Item = ({ children, className = 'status-label', onClick, style: itemStyle }: { children: React.ReactNode; className?: string; onClick?: () => void; style?: React.CSSProperties }) => (
    <span
      className={className}
      onClick={onClick}
      style={{
        flexShrink: 1,
        minWidth: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        cursor: onClick ? 'pointer' : undefined,
        ...itemStyle,
      }}
    >
      {children}
    </span>
  );

  return (
    <>
      <footer
        style={{
          height: '24px',
          background: 'var(--color-bg-inset)',
          borderTop: '0.5px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 8px',
          gap: '6px',
          fontSize: '10px',
          color: 'var(--color-text-muted)',
          fontFamily: 'var(--font-sans)',
          fontVariantNumeric: 'tabular-nums',
          flexShrink: 0,
        }}
      >
        <span style={{ color: statusColor, flexShrink: 0 }}>●</span>
        {state === 'connected' && (
          <Item>
            {schedState === 'idle' ? '就绪' :
             schedState === 'write' ? '写入' :
             schedState === 'read' ? '读取' : '轮询'}
          </Item>
        )}
        {state === 'connecting' && <Item>连接中</Item>}
        {state === 'error' && <Item>错误</Item>}
        {state !== 'connected' && state !== 'connecting' && state !== 'error' && <Item>空闲</Item>}
        {sep()}
        <Item>{pollInterval}ms</Item>
        {profile && (
          <>
            {sep()}
            <Item onClick={() => setLearnOpen(true)}>{profile.name}</Item>
          </>
        )}
        {state === 'connected' && (avgW > 0 || avgR > 0) && (
          <>
            {sep()}
            <Item onClick={() => setDebugOpen(true)}>
              <span style={{ color: 'var(--color-success)' }}>写 {avgW}ms</span>
              {' '}
              <span style={{ color: 'var(--color-accent)' }}>读 {avgR}ms</span>
            </Item>
          </>
        )}
        <div style={{ flex: 1, minWidth: 0 }} />
        <span style={{ color: 'var(--color-text-dim)', flexShrink: 0, whiteSpace: 'nowrap' }}>{timeStr} GMT+8</span>
      </footer>

      {debugOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setDebugOpen(false)}
        >
          <div
            style={{
              background: 'var(--color-bg-surface)',
              borderRadius: 12,
              width: 'min(720px, 95vw)',
              height: 'min(85vh, 600px)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderBottom: '0.5px solid var(--color-border)',
                flexShrink: 0,
              }}
            >
              <span style={{ fontWeight: 600, fontSize: 14 }}>BLE 性能</span>
              <button
                onClick={() => setDebugOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 18,
                  cursor: 'pointer',
                  color: 'var(--color-text)',
                  padding: '0 4px',
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '0 16px 16px' }}>
              <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', opacity: 0.4 }}>加载中...</div>}>
                <DebugBle />
              </Suspense>
            </div>
          </div>
        </div>
      )}

      {learnOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setLearnOpen(false)}
        >
          <div
            style={{
              background: 'var(--color-bg-surface)',
              borderRadius: 12,
              width: 'min(720px, 95vw)',
              height: 'min(85vh, 700px)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderBottom: '0.5px solid var(--color-border)',
                flexShrink: 0,
              }}
            >
              <span style={{ fontWeight: 600, fontSize: 14 }}>电池学习</span>
              <button
                onClick={() => setLearnOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 18,
                  cursor: 'pointer',
                  color: 'var(--color-text)',
                  padding: '0 4px',
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '0 16px 16px' }}>
              <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', opacity: 0.4 }}>加载中...</div>}>
                <BatteryLearn />
              </Suspense>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
