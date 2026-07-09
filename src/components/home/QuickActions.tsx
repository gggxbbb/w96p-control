import { type ReactNode } from 'react';

interface Action {
  key: string;
  icon: ReactNode;
  label: string;
  active?: boolean;
  accent?: string;
  onClick: () => void;
}

interface QuickActionsProps {
  actions: Action[];
}

export function QuickActions({ actions }: QuickActionsProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
      {actions.map((a) => (
        <button
          key={a.key}
          type="button"
          onClick={a.onClick}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 8,
          }}
        >
          <div style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            background: a.active ? (a.accent ?? 'var(--color-new-accent)') : 'var(--color-new-bg-surface)',
            color: a.active ? 'var(--color-new-text-on-accent)' : 'var(--color-new-text-dim)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            boxShadow: a.active ? `0 4px 12px ${a.accent ?? 'var(--color-new-accent)'}40` : 'inset 0 0 0 1px var(--color-new-border)',
          }}>
            {a.icon}
          </div>
          <span style={{ fontSize: 11, color: 'var(--color-new-text)' }}>{a.label}</span>
        </button>
      ))}
    </div>
  );
}
