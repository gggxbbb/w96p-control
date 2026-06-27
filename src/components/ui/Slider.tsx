interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  onCommit?: (v: number) => void;
  label?: string;
}

export function Slider({ value, min, max, step = 1, onChange, onCommit, label }: SliderProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-text-muted)' }}>
          <span>{label}</span>
          <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--color-text)' }}>
            {value}{label.includes('%') ? '%' : ''}
          </span>
        </div>
      )}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onMouseUp={(e) => onCommit?.(Number((e.target as HTMLInputElement).value))}
        onTouchEnd={(e) => onCommit?.(Number((e.target as HTMLInputElement).value))}
        style={{
          width: '100%',
          accentColor: 'var(--color-accent)',
          height: '4px',
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--color-text-dim)' }}>
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
