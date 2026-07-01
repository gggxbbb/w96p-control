import { useState, useRef, useEffect } from 'react';
import { useBle } from '../../hooks/useBle';

export function DisconnectedScreen() {
  const { connectReal, connectVirtual } = useBle();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
      <div ref={menuRef} style={{ position: 'relative' }}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
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
          连接设备 ▾
        </button>
        {menuOpen && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              marginTop: '4px',
              background: 'var(--color-bg-surface)',
              border: '0.5px solid var(--color-border)',
              borderRadius: '6px',
              padding: '4px',
              minWidth: '180px',
              zIndex: 100,
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              textAlign: 'left',
            }}
          >
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
              虚拟 W66D（0-100）
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

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
