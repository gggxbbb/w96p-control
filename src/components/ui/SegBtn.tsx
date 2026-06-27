interface SegBtnOption<T extends string | number> {
  value: T;
  label: string;
}

interface SegBtnProps<T extends string | number> {
  options: SegBtnOption<T>[];
  value: T;
  onChange: (v: T) => void;
}

export function SegBtn<T extends string | number>({ options, value, onChange }: SegBtnProps<T>) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${options.length}, 1fr)`, gap: '6px' }}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            onClick={() => onChange(opt.value)}
            style={{
              background: active ? 'color-mix(in srgb, var(--color-accent) 13%, transparent)' : 'var(--color-bg-page)',
              border: `0.5px solid ${active ? 'var(--color-accent)' : 'var(--color-border-strong)'}`,
              borderRadius: '4px',
              padding: '8px 4px',
              color: active ? 'var(--color-accent)' : 'var(--color-text-muted)',
              fontSize: '11px',
              fontWeight: active ? 500 : 400,
              fontFamily: 'var(--font-sans)',
              cursor: 'pointer',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
