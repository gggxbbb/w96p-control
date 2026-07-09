interface MetricRowProps {
  label: string;
  value: string | number;
  unit?: string;
}

export function MetricRow({ label, value, unit }: MetricRowProps) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 11, color: 'var(--color-new-text-muted)' }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--color-new-text)', marginTop: 2 }}>
        {value}{unit && <span style={{ fontSize: 11, color: 'var(--color-new-text-muted)', marginLeft: 2 }}>{unit}</span>}
      </div>
    </div>
  );
}
