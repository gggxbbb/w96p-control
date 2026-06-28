import { useState, useEffect } from 'react';
import { useBle } from '../../hooks/useBle';
import { useDeviceStore } from '../../stores/device';
import { Card } from '../ui/Card';
import { GearRow } from './GearRow';
import { Toggle } from '../ui/Toggle';

export function SpeedControl() {
  const { profile, setFanSpeed, toggleNatureWind } = useBle();
  const fanSpeed = useDeviceStore((s) => s.fanSpeed);
  const natureWindOn = useDeviceStore((s) => s.natureWindOn);

  const min = profile?.minSpeed ?? 0;
  const max = profile?.maxSpeed ?? 100;

  const [dragSpeed, setDragSpeed] = useState<number | null>(null);
  const [inputValue, setInputValue] = useState(String(fanSpeed));
  const [adjustInterval, setAdjustInterval] = useState<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (dragSpeed === null) setInputValue(String(fanSpeed));
  }, [fanSpeed, dragSpeed]);

  const displaySpeed = dragSpeed ?? fanSpeed;

  const commit = (v: number) => {
    const clamped = Math.max(min, Math.min(max, v));
    setFanSpeed(clamped);
  };

  const startAdjust = (delta: number) => {
    commit(displaySpeed + delta);
    const id = setInterval(() => {
      setDragSpeed((prev) => {
        const cur = prev ?? fanSpeed;
        const next = Math.max(min, Math.min(max, cur + delta));
        return next;
      });
    }, 100);
    setAdjustInterval(id);
  };

  const stopAdjust = () => {
    if (adjustInterval) {
      clearInterval(adjustInterval);
      setAdjustInterval(null);
    }
    if (dragSpeed !== null) {
      commit(dragSpeed);
      setDragSpeed(null);
    }
  };

  useEffect(() => () => { if (adjustInterval) clearInterval(adjustInterval); }, [adjustInterval]);

  const submitInput = () => {
    const v = parseInt(inputValue, 10);
    if (!isNaN(v)) commit(v);
    else setInputValue(String(fanSpeed));
  };

  return (
    <Card title="转速控制" subtitle={natureWindOn ? '自然风模式' : '手动模式'}>
      <GearRow />

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px' }}>
        <span style={{ color: 'var(--color-text-muted)', fontSize: '10px', width: '36px' }}>转速</span>
        <input
          type="range"
          min={min}
          max={max}
          value={displaySpeed}
          onChange={(e) => setDragSpeed(Number(e.target.value))}
          onMouseUp={(e) => { commit(Number((e.target as HTMLInputElement).value)); setDragSpeed(null); }}
          onTouchEnd={(e) => { commit(Number((e.target as HTMLInputElement).value)); setDragSpeed(null); }}
          style={{ flex: 1, accentColor: 'var(--color-accent)', height: '4px' }}
        />
        <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: '12px', minWidth: '40px', textAlign: 'right' }}>
          {displaySpeed}%
        </span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--color-text-dim)', paddingLeft: '46px' }}>
        <span>{min}</span>
        <span>{max}</span>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginTop: '10px', alignItems: 'center' }}>
        <button
          onMouseDown={() => startAdjust(-1)}
          onMouseUp={stopAdjust}
          onMouseLeave={stopAdjust}
          onTouchStart={() => startAdjust(-1)}
          onTouchEnd={stopAdjust}
          style={btnStyle}
        >−</button>
        <button
          onMouseDown={() => startAdjust(1)}
          onMouseUp={stopAdjust}
          onMouseLeave={stopAdjust}
          onTouchStart={() => startAdjust(1)}
          onTouchEnd={stopAdjust}
          style={btnStyle}
        >+</button>
        <div style={{ flex: 1 }} />
        <input
          type="number"
          min={min}
          max={max}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={submitInput}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
          style={numberInputStyle}
        />
        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>%</span>
      </div>

      <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '0.5px solid var(--color-border)' }}>
        <Toggle checked={natureWindOn} onChange={(on) => toggleNatureWind(on)} label="自然风模式" />
      </div>
    </Card>
  );
}

const btnStyle: React.CSSProperties = {
  width: '40px',
  height: '40px',
  background: 'transparent',
  border: '0.5px solid var(--color-border-strong)',
  borderRadius: '4px',
  color: 'var(--color-text-muted)',
  fontSize: '18px',
  fontFamily: 'var(--font-sans)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

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
