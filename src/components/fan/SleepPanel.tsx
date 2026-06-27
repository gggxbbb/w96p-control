import { useState } from 'react';
import { useBle } from '../../hooks/useBle';
import { useDeviceStore } from '../../stores/device';
import { useToastStore } from '../../stores/toast';
import { Card } from '../ui/Card';
import { fmtShutdown } from '../../lib/format';

export function SleepPanel() {
  const { setShutdownDelay } = useBle();
  const shutdownDelaySec = useDeviceStore((s) => s.shutdownDelaySec);
  const show = useToastStore((s) => s.show);
  const [sec, setSec] = useState('60');

  const apply = () => {
    const v = parseInt(sec, 10);
    if (isNaN(v) || v < 0) { show('请输入有效秒数'); return; }
    setShutdownDelay(v);
    show(`休眠延时已设置：${v < 10 && v > 0 ? 10 : v} 秒`);
  };

  const never = () => {
    setShutdownDelay(0);
    show('已设置为永不休眠');
  };

  return (
    <Card title="蓝牙休眠延时">
      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>
        当前：<span style={{ color: 'var(--color-text)' }}>{fmtShutdown(shutdownDelaySec)}</span>
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
        <input
          type="number"
          min={10}
          max={65535}
          value={sec}
          onChange={(e) => setSec(e.target.value)}
          style={numberInputStyle}
        />
        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>秒</span>
        <div style={{ flex: 1 }} />
        <button onClick={apply} style={primaryBtnStyle}>应用</button>
        <button onClick={never} style={presetBtnStyle}>永不</button>
      </div>
      <div style={{ fontSize: '10px', color: 'var(--color-text-dim)' }}>
        范围 10-65535 秒，输入 1-9 会自动修正为 10
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
