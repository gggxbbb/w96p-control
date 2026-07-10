import { useState, useEffect } from 'react';
import { useBle } from '../../hooks/useBle';
import { useDeviceStore } from '../../stores/device';
import { useToastStore } from '../../stores/toast';
import { Card } from '../ui/Card';
import { Toggle } from '../ui/Toggle';
import { getFeatures } from '@gggxbbb/w96p-ble-sdk';

export function TurboPanel() {
  const { setTurbo, setTurboTime, readTurboTime } = useBle();
  const show = useToastStore((s) => s.show);

  const features = getFeatures(useDeviceStore((s) => s.firmwareVersion));
  const turboCountdownSec = useDeviceStore((s) => s.turboCountdownSec);
  const has2Byte = features.has('turbo2Byte');
  const hasCountdown = features.has('turboCountdown');

  const maxSec = has2Byte ? 600 : 199;

  const [turboOn, setTurboOn] = useState(false);
  const [turboSec, setTurboSec] = useState(String(maxSec));
  const [countdown, setCountdown] = useState<number | null>(null);

  // 挂载时读取一次当前 Turbo 时间
  useEffect(() => {
    readTurboTime().then((v: number) => {
      if (v > 0) setTurboSec(String(v));
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 从全局轮询的 store 中同步 Turbo 倒计时，不再额外 GATT 读取
  useEffect(() => {
    if (!hasCountdown) return;
    const v = turboCountdownSec;
    setCountdown(v > 0 ? v : null);
    if (v > 0 && !turboOn) setTurboOn(true);
    else if (v === 0 && turboOn) setTurboOn(false);
  }, [hasCountdown, turboCountdownSec, turboOn]);

  const handleTurboToggle = (on: boolean) => {
    setTurbo(on);
    setTurboOn(on);
  };

  const handleDefault = async () => {
    await setTurboTime(0);
    try {
      const v = await readTurboTime();
      setTurboSec(String(v));
      show(`已恢复默认 Turbo 时间 (${v} 秒)`);
    } catch {
      show('已恢复默认 Turbo 时间');
    }
  };

  const handleSetTurboTime = async () => {
    const v = parseInt(turboSec, 10);
    if (isNaN(v) || v < 0 || v > maxSec) {
      show(`Turbo 时间范围为 1-${maxSec} 秒（0=恢复默认）`);
      return;
    }
    await setTurboTime(v);
    try {
      const actual = await readTurboTime();
      setTurboSec(String(actual));
      show(`Turbo 时间已设置：${actual} 秒`);
    } catch {
      setTurboSec(String(v));
      show(`Turbo 时间已设置：${v} 秒`);
    }
  };

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}:${String(sec).padStart(2, '0')}` : `${sec}s`;
  };

  return (
    <Card title="Turbo 模式">
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
          Turbo 时间（1-{maxSec} 秒，0=恢复默认 199 秒）
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
          <button onClick={handleDefault} style={presetBtnStyle}>
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
