const GEARS = [1, 2, 3, 4] as const;

export function computeGear(speed: number, calib: number[], natureWindOn: boolean): number {
  if (speed === 0 || natureWindOn) return 0;
  let best = 0;
  let minDiff = Infinity;
  calib.forEach((sp, i) => {
    const d = Math.abs(sp - speed);
    if (d < minDiff) {
      minDiff = d;
      best = i + 1;
    }
  });
  return best;
}

interface GearChipsProps {
  speed: number;
  calib: number[];
  natureWindOn: boolean;
  onGear: (gear: number) => void;
}

export function GearChips({ speed, calib, natureWindOn, onGear }: GearChipsProps) {
  const active = computeGear(speed, calib, natureWindOn);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
      {GEARS.map((g) => {
        const isActive = active === g;
        return (
          <button
            key={g}
            onClick={() => onGear(g)}
            style={{
              padding: '8px 16px',
              borderRadius: 20,
              border: 'none',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              background: isActive ? 'var(--color-new-accent)' : 'var(--color-new-bg-surface)',
              color: isActive ? '#FFFFFF' : 'var(--color-new-text-dim)',
              boxShadow: isActive ? '0 4px 12px rgba(255,140,66,0.25)' : 'inset 0 0 0 1px var(--color-new-border)',
            }}
          >
            {g} 档
          </button>
        );
      })}
    </div>
  );
}
