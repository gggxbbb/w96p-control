type Status = 'muted' | 'default' | 'success' | 'warning' | 'danger';

interface StatusPillProps {
  status: Status;
  label: string;
}

const statusConfig: Record<Status, { color: string; bg: string }> = {
  muted: { color: 'var(--color-border)', bg: 'transparent' },
  default: { color: 'var(--color-text-muted)', bg: 'transparent' },
  success: { color: 'var(--color-success)', bg: 'transparent' },
  warning: { color: 'var(--color-warning)', bg: 'transparent' },
  danger: { color: 'var(--color-danger)', bg: 'transparent' },
};

export function StatusPill({ status, label }: StatusPillProps) {
  const cfg = statusConfig[status];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        background: cfg.bg,
        border: `0.5px solid ${cfg.color}`,
        borderRadius: '4px',
        color: cfg.color,
        fontSize: '11px',
        letterSpacing: '0.5px',
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: cfg.color,
        }}
      />
      {label}
    </span>
  );
}
