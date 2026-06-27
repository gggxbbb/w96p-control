interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}

export function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <label
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        cursor: 'pointer',
        fontSize: '12px',
        color: 'var(--color-text)',
      }}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        style={{
          width: '36px',
          height: '20px',
          borderRadius: '10px',
          border: '0.5px solid var(--color-border-strong)',
          background: checked ? 'var(--color-success)' : 'var(--color-bg-page)',
          position: 'relative',
          cursor: 'pointer',
          padding: 0,
          transition: 'background 0.15s',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: '2px',
            left: checked ? '18px' : '2px',
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            background: 'var(--color-text)',
            transition: 'left 0.15s',
          }}
        />
      </button>
      {label && <span>{label}</span>}
    </label>
  );
}
