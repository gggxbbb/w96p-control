import { useBle } from '../../hooks/useBle';

export function DisconnectedScreen() {
  const { connectReal } = useBle();
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        gap: '16px',
        textAlign: 'center',
      }}
    >
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-dim)" strokeWidth="1">
        <path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z" />
      </svg>
      <div>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 500 }}>设备未连接</h2>
        <p style={{ margin: '8px 0 0', fontSize: '13px', color: 'var(--color-text-muted)' }}>
          连接 W96P / W66D 风扇设备开始控制
        </p>
      </div>
      <button
        onClick={connectReal}
        style={{
          background: 'var(--color-accent)',
          color: 'var(--color-bg-page)',
          border: 'none',
          borderRadius: '6px',
          padding: '10px 24px',
          fontSize: '13px',
          fontWeight: 500,
          fontFamily: 'var(--font-sans)',
          cursor: 'pointer',
        }}
      >
        连接设备
      </button>
    </div>
  );
}
