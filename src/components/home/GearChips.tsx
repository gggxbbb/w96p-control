import { inferGear } from '../../lib/gear';

const GEARS = [1, 2, 3, 4] as const;

interface GearChipsProps {
  speed: number;
  calibration: number[];
  natureWindOn: boolean;
  onGear: (gear: 1 | 2 | 3 | 4) => void;
}

export function GearChips({ speed, calibration, natureWindOn, onGear }: GearChipsProps) {
  const active = inferGear(speed, calibration, natureWindOn);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
      {GEARS.map((g) => {
        const isActive = active === g;
        return (
          <button
            type="button"
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
              color: isActive ? 'var(--color-new-text-on-accent)' : 'var(--color-new-text-dim)',
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
