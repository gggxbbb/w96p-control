import { useState } from 'react';
import { useBle } from '../../hooks/useBle';
import { useDeviceStore } from '../../stores/device';
import { useToastStore } from '../../stores/toast';
import { Card } from '../ui/Card';
import { fmtTimer } from '../../lib/format';

export function TimerPanel({ dragHandle, style }: { dragHandle?: boolean; style?: React.CSSProperties }) {
  const { setTimer, cancelTimer, readTimer } = useBle();
  const timerRemainingSec = useDeviceStore((s) => s.timerRemainingSec);
  const show = useToastStore((s) => s.show);
  const [minutes, setMinutes] = useState('30');

  const apply = (m: number) => {
    const clamped = Math.max(1, Math.min(480, m));
    setTimer(clamped);
    show(`已设置定时 ${clamped} 分钟`);
  };

  const cancel = () => {
    cancelTimer();
    show('已取消定时');
  };

  const read = async () => {
    try {
      const sec = await readTimer();
      show(`剩余 ${fmtTimer(sec)}`);
    } catch {
      show('读取失败');
    }
  };

  return (
    <Card title="定时关机" dragHandle={dragHandle} style={style}>
      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>
        剩余：<span style={{ color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}>{fmtTimer(timerRemainingSec)}</span>
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
        <input
          type="number"
          min={1}
          max={480}
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          style={numberInputStyle}
        />
        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>分钟</span>
        <div style={{ flex: 1 }} />
        <button onClick={() => apply(parseInt(minutes, 10) || 30)} style={primaryBtnStyle}>设置</button>
        <button onClick={cancel} style={dangerBtnStyle}>取消</button>
      </div>
      <div style={{ display: 'flex', gap: '6px' }}>
        <button onClick={() => { setMinutes('60'); apply(60); }} style={presetBtnStyle}>1 小时</button>
        <button onClick={() => { setMinutes('240'); apply(240); }} style={presetBtnStyle}>4 小时</button>
        <button onClick={read} style={presetBtnStyle}>读取剩余</button>
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

const dangerBtnStyle: React.CSSProperties = {
  background: 'transparent',
  color: 'var(--color-danger)',
  border: '0.5px solid var(--color-danger)',
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
  padding: '6px 10px',
  fontSize: '11px',
  fontFamily: 'var(--font-sans)',
  cursor: 'pointer',
  flex: 1,
};
