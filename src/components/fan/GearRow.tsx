import { useBle } from '../../hooks/useBle';
import { useDeviceStore } from '../../stores/device';

const GEARS = [
  { value: 0 as const, label: '关机' },
  { value: 1 as const, label: '1档' },
  { value: 2 as const, label: '2档' },
  { value: 3 as const, label: '3档' },
  { value: 4 as const, label: '4档' },
];

export function GearRow() {
  const { setGear } = useBle();
  const fanSpeed = useDeviceStore((s) => s.fanSpeed);
  const natureWindOn = useDeviceStore((s) => s.natureWindOn);
  const speedCalib = useDeviceStore((s) => s.speedCalib);

  // 推断当前档位：fanSpeed===0 或自然风模式下显示 OFF；否则按 speedCalib 匹配最近档位
  const inferGear = (): 0 | 1 | 2 | 3 | 4 => {
    if (fanSpeed === 0 || natureWindOn) return 0;
    let best: 0 | 1 | 2 | 3 | 4 = 0;
    let minDiff = Infinity;
    speedCalib.forEach((sp, i) => {
      const diff = Math.abs(sp - fanSpeed);
      if (diff < minDiff) {
        minDiff = diff;
        best = (i + 1) as 1 | 2 | 3 | 4;
      }
    });
    return best;
  };
  const current = inferGear();

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
      {GEARS.map((g) => {
        const active = current === g.value;
        return (
          <button
            key={g.value}
            onClick={() => setGear(g.value)}
            style={{
              background: active
                ? 'color-mix(in srgb, var(--color-accent) 13%, transparent)'
                : 'var(--color-bg-page)',
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
            {g.label}
          </button>
        );
      })}
    </div>
  );
}
