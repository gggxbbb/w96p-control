type Accent = 'default' | 'success' | 'warning' | 'danger';

interface MetricCardProps {
  label: string;
  value: number | string;
  unit?: string;
  accent?: Accent;
  style?: React.CSSProperties;
}

const accentColor: Record<Accent, string> = {
  default: 'var(--color-text)',
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  danger: 'var(--color-danger)',
};

export function MetricCard({ label, value, unit, accent = 'default', style }: MetricCardProps) {
  return (
    <div
      className="drag-handle"
      style={{
        background: 'var(--color-bg-surface)',
        border: '0.5px solid var(--color-border)',
        borderRadius: '6px',
        padding: '10px 12px',
        cursor: 'move',
        userSelect: 'none',
        height: '100%',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      <div
        style={{
          color: 'var(--color-text-muted)',
          fontSize: '10px',
          letterSpacing: '0.05em',
          marginBottom: '4px',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: '22px',
          fontWeight: 500,
          color: accentColor[accent],
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1.2,
        }}
      >
        {value}
        {unit && (
          <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginLeft: '2px' }}>
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}
