import { useState, useEffect } from 'react';
import { useBle } from '../../hooks/useBle';
import { useDeviceStore } from '../../stores/device';
import { useToastStore } from '../../stores/toast';
import { Card } from '../ui/Card';

export function SpeedCalibPanel() {
  const { profile, setSpeedCalib } = useBle();
  const speedCalib = useDeviceStore((s) => s.speedCalib);
  const show = useToastStore((s) => s.show);
  const [speeds, setSpeeds] = useState<string[]>([...speedCalib.map(String)]);

  useEffect(() => { setSpeeds([...speedCalib.map(String)]); }, [speedCalib]);

  const defaults = profile?.defaultSpeeds ?? [30, 50, 70, 100];

  const apply = () => {
    const nums = speeds.map((s) => parseInt(s, 10) || 0) as [number, number, number, number];
    setSpeedCalib(nums);
    show('档位风速已应用');
  };
  const reset = () => {
    setSpeeds([...defaults.map(String)]);
    setSpeedCalib([...defaults] as [number, number, number, number]);
    show('已恢复默认档位风速');
  };

  return (
    <Card title="档位风速校准">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', minWidth: '32px' }}>{i + 1}档</span>
            <input
              type="number"
              min={0}
              max={100}
              value={speeds[i]}
              onChange={(e) => {
                const next = [...speeds];
                next[i] = e.target.value;
                setSpeeds(next);
              }}
              style={numberInputStyle}
            />
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>%</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '6px' }}>
        <button onClick={apply} style={primaryBtnStyle}>应用</button>
        <button onClick={reset} style={presetBtnStyle}>恢复默认</button>
      </div>
    </Card>
  );
}

const numberInputStyle: React.CSSProperties = {
  width: '60px',
  background: 'var(--color-bg-page)',
  border: '0.5px solid var(--color-border-strong)',
  borderRadius: '4px',
  padding: '6px 8px',
  color: 'var(--color-text)',
  fontSize: '12px',
  fontFamily: 'var(--font-sans)',
  fontVariantNumeric: 'tabular-nums',
  textAlign: 'right',
};

const primaryBtnStyle: React.CSSProperties = {
  background: 'var(--color-success)',
  color: 'var(--color-bg-page)',
  border: 'none',
  borderRadius: '4px',
  padding: '6px 12px',
  fontSize: '11px',
  fontFamily: 'var(--font-sans)',
  cursor: 'pointer',
};

const presetBtnStyle: React.CSSProperties = {
  background: 'transparent',
  color: 'var(--color-text-muted)',
  border: '0.5px solid var(--color-border-strong)',
  borderRadius: '4px',
  padding: '6px 12px',
  fontSize: '11px',
  fontFamily: 'var(--font-sans)',
  cursor: 'pointer',
};
