import { useState, useEffect, useCallback } from 'react';
import { useBle } from '../../hooks/useBle';
import { useDeviceStore } from '../../stores/device';
import { useToastStore } from '../../stores/toast';
import { Card } from '../ui/Card';
import { Toggle } from '../ui/Toggle';
import { getFeatures } from '../../ble/features';

export function TurboPanel() {
  const { setTurbo, setTurboTime, readTurboCountdown } = useBle();
  const firmwareVersion = useDeviceStore((s) => s.firmwareVersion);
  const show = useToastStore((s) => s.show);

  const features = getFeatures(firmwareVersion);
  const hasTurbo = features.has('turbo');
  const has2Byte = features.has('turbo2Byte');
  const hasCountdown = features.has('turboCountdown');

  if (!hasTurbo) return null;

  const maxSec = has2Byte ? 600 : 199;

  const [turboOn, setTurboOn] = useState(false);
  const [turboSec, setTurboSec] = useState(String(maxSec));
  const [countdown, setCountdown] = useState<number | null>(null);

  const pollCountdown = useCallback(() => {
    if (!hasCountdown) return;
    readTurboCountdown().then((v) => {
      setCountdown(v > 0 ? v : null);
      if (v > 0 && !turboOn) setTurboOn(true);
      else if (v === 0 && turboOn) setTurboOn(false);
    }).catch(() => {});
  }, [hasCountdown, readTurboCountdown, turboOn]);

  useEffect(() => {
    if (!hasCountdown) return;
    const id = setInterval(pollCountdown, 1000);
    return () => clearInterval(id);
  }, [hasCountdown, pollCountdown]);

  const handleTurboToggle = (on: boolean) => {
    setTurbo(on);
    setTurboOn(on);
  };

  const handleSetTurboTime = () => {
    const v = parseInt(turboSec, 10);
    if (isNaN(v) || v < 0 || v > maxSec) {
      show(`Turbo 时间范围为 1-${maxSec} 秒（0=恢复默认）`);
      return;
    }
    setTurboTime(v);
    show(v === 0 ? `已恢复默认 Turbo 时间 (${maxSec}秒)` : `Turbo 时间已设置：${v} 秒`);
  };

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}:${String(sec).padStart(2, '0')}` : `${sec}s`;
  };

  return (
    <Card title="Turbo 模式" subtitle={firmwareVersion ? `v${firmwareVersion}` : undefined}>
      <Toggle
        checked={turboOn}
        onChange={handleTurboToggle}
        label="Turbo 模式"
      />
      {hasCountdown && countdown !== null && (
        <div style={{ fontSize: '12px', color: 'var(--color-accent)', marginTop: '4px', fontVariantNumeric: 'tabular-nums' }}>
          剩余 {fmtTime(countdown)}
        </div>
      )}

      <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '0.5px solid var(--color-border)' }}>
        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
          Turbo 时间（1-{maxSec} 秒，0=恢复默认 {maxSec} 秒）
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="number"
            min={0}
            max={maxSec}
            value={turboSec}
            onChange={(e) => setTurboSec(e.target.value)}
            style={numberInputStyle}
          />
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>秒</span>
          <div style={{ flex: 1 }} />
          <button onClick={handleSetTurboTime} style={presetBtnStyle}>应用</button>
          <button
            onClick={() => { setTurboSec('0'); setTurboTime(0); show('已恢复默认 Turbo 时间'); }}
            style={presetBtnStyle}
          >
            默认
          </button>
        </div>
      </div>
    </Card>
  );
}

const numberInputStyle: React.CSSProperties = {
  width: '80px',
  background: 'var(--color-bg-page)',
  border: '0.5px solid var(--color-border-strong)',
  borderRadius: '4px',
  padding: '6px 8px',
  color: 'var(--color-text)',
  fontSize: '12px',
  fontFamily: 'var(--font-sans)',
  fontVariantNumeric: 'tabular-nums',
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
