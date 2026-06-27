import { forwardRef, type ReactNode, type CSSProperties } from 'react';

interface CardProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
  /** 是否将 header 作为拖拽手柄。设为 true 时 header 获得 .drag-handle 类 */
  dragHandle?: boolean;
  style?: CSSProperties;
  className?: string;
}

export const Card = forwardRef<HTMLElement, CardProps>(function Card(
  { title, subtitle, children, actions, dragHandle, style, className },
  ref,
) {
  const headerClass = dragHandle ? 'drag-handle' : '';

  return (
    <section
      ref={ref}
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
          className={headerClass}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '8px',
            borderBottom: '0.5px solid var(--color-border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
            {dragHandle && (
              <svg
                className="drag-handle-icon"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="currentColor"
                style={{ color: 'var(--color-text-dim)', flexShrink: 0 }}
              >
                <circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" />
                <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
                <circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" />
              </svg>
            )}
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
          {actions && <div className="no-drag">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
});
