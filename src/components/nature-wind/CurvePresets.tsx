import type { CSSProperties } from 'react';
import { PRESETS, randomCurve, DEFAULT_CURVE } from '../../lib/curvePresets';

interface CurvePresetsProps {
  min: number;
  max: number;
  onApply: (points: number[]) => void;
}

export function CurvePresets({ min, max, onApply }: CurvePresetsProps) {
  const btnStyle: CSSProperties = {
    background: 'transparent',
    color: 'var(--color-text-muted)',
    border: '0.5px solid var(--color-border-strong)',
    borderRadius: '4px',
    padding: '6px 10px',
    fontSize: '11px',
    fontFamily: 'var(--font-sans)',
    cursor: 'pointer',
  };

  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
      <button style={btnStyle} onClick={() => onApply([...PRESETS.smooth.data])}>平滑</button>
      <button style={btnStyle} onClick={() => onApply([...PRESETS.quiet.data])}>安静</button>
      <button style={btnStyle} onClick={() => onApply([...PRESETS.strong.data])}>强劲</button>
      <button style={btnStyle} onClick={() => onApply(randomCurve(min, max))}>随机</button>
      <button style={btnStyle} onClick={() => onApply([...DEFAULT_CURVE])}>默认</button>
    </div>
  );
}
