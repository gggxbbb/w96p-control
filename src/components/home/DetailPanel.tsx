import { useState, type ReactNode } from 'react';

interface DetailPanelProps {
  children: ReactNode;
  onOpenAdvanced?: () => void;
}

export function DetailPanel({ children, onOpenAdvanced }: DetailPanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          alignSelf: 'center',
          padding: '8px 16px',
          borderRadius: 20,
          border: '1px solid var(--color-new-border)',
          background: 'var(--color-new-bg-surface)',
          color: 'var(--color-new-text-dim)',
          fontSize: 12,
          cursor: 'pointer',
        }}
      >
        实时数据 {open ? '▾' : '▸'}
      </button>
      {open && (
        <div style={{
          background: 'var(--color-new-bg-surface)',
          border: '1px solid var(--color-new-border)',
          borderRadius: 16,
          padding: 14,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
        }}>
          {children}
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', marginTop: 4 }}>
            <button
              type="button"
              onClick={onOpenAdvanced}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--color-new-text-muted)',
                fontSize: 11,
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              打开完整面板
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
