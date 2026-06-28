import { type ReactNode, type CSSProperties } from 'react';

interface CardProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
  style?: CSSProperties;
  className?: string;
}

export function Card({ title, subtitle, children, actions, style, className }: CardProps) {
  return (
    <section
      className={className}
      style={{
        background: 'var(--color-bg-surface)',
        border: '0.5px solid var(--color-border)',
        borderRadius: '8px',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        height: '100%',
        overflow: 'auto',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      {(title || actions) && (
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '8px',
            borderBottom: '0.5px solid var(--color-border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
            <div style={{ minWidth: 0 }}>
              {title && (
                <h2 style={{ margin: 0, fontSize: '13px', fontWeight: 500, letterSpacing: '0.5px' }}>
                  {title}
                </h2>
              )}
              {subtitle && (
                <p style={{ margin: 0, fontSize: '11px', color: 'var(--color-text-muted)' }}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {actions && <div>{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}
