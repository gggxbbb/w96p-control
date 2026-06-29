import { useState } from 'react';
import { useBle } from '../../hooks/useBle';
import { useDeviceStore } from '../../stores/device';
import { useToastStore } from '../../stores/toast';
import { Card } from '../ui/Card';
import { fmtTimer } from '../../lib/format';

const MAX_SEC = 8 * 3600; // 8 hours

function pad(n: number) { return n.toString().padStart(2, '0'); }

export function TimerPanel() {
  const { setTimer, cancelTimer, readTimer } = useBle();
  const timerRemainingSec = useDeviceStore((s) => s.timerRemainingSec);
  const show = useToastStore((s) => s.show);

  const [h, setH] = useState(0);
  const [m, setM] = useState(30);
  const [s, setS] = useState(0);

  const totalSec = h * 3600 + m * 60 + s;

  const apply = () => {
    const sec = Math.max(1, Math.min(MAX_SEC, totalSec));
    setTimer(sec);
    show(`已设置定时 ${fmtTimer(sec)}`);
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

  const preset = (sec: number) => {
    setH(Math.floor(sec / 3600));
    setM(Math.floor((sec % 3600) / 60));
    setS(sec % 60);
    setTimer(sec);
    show(`已设置定时 ${fmtTimer(sec)}`);
  };

  const Stepper = ({ value, max, setValue }: { value: number; max: number; setValue: (v: number) => void }) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <button onClick={() => setValue(Math.min(max, value + 1))} style={stepperArrow}>
        ▲
      </button>
      <input
        type="text"
        inputMode="numeric"
        value={pad(value)}
        onChange={(e) => {
          const n = parseInt(e.target.value.replace(/\D/g, ''), 10);
          if (!isNaN(n)) setValue(Math.min(max, Math.max(0, n)));
        }}
        style={stepperInput}
      />
      <button onClick={() => setValue(Math.max(0, value - 1))} style={stepperArrow}>
        ▼
      </button>
    </div>
  );

  return (
    <Card title="定时关机">
      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
        剩余：<span style={{ color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
          {fmtTimer(timerRemainingSec)}
        </span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', alignItems: 'center', marginBottom: '12px' }}>
        <Stepper value={h} max={8} setValue={setH} />
        <span style={colon}>:</span>
        <Stepper value={m} max={59} setValue={setM} />
        <span style={colon}>:</span>
        <Stepper value={s} max={59} setValue={setS} />
      </div>

      <div style={{ textAlign: 'center', marginBottom: '12px', fontSize: '11px', color: 'var(--color-text-muted)' }}>
        合计 {fmtTimer(totalSec)}
      </div>

      <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
        <button onClick={apply} disabled={totalSec === 0} style={primaryBtnStyle}>设置</button>
        <button onClick={cancel} style={dangerBtnStyle}>取消</button>
      </div>

      <div style={{ display: 'flex', gap: '6px' }}>
        <button onClick={() => preset(1800)} style={presetBtnStyle}>30 分</button>
        <button onClick={() => preset(3600)} style={presetBtnStyle}>1 小时</button>
        <button onClick={() => preset(7200)} style={presetBtnStyle}>2 小时</button>
        <button onClick={() => preset(14400)} style={presetBtnStyle}>4 小时</button>
        <button onClick={read} style={presetBtnStyle}>读取</button>
      </div>
    </Card>
  );
}

const colon: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: 700,
  color: 'var(--color-text-muted)',
  alignSelf: 'center',
  marginTop: '-4px',
};

const stepperArrow: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--color-text-muted)',
  fontSize: '10px',
  cursor: 'pointer',
  padding: '0 4px',
  lineHeight: 1,
};

const stepperInput: React.CSSProperties = {
  width: '48px',
  textAlign: 'center',
  fontSize: '24px',
  fontWeight: 700,
  fontFamily: 'var(--font-mono, monospace)',
  fontVariantNumeric: 'tabular-nums',
  background: 'var(--color-bg-page)',
  border: '1px solid var(--color-border-strong)',
  borderRadius: '6px',
  padding: '4px 0',
  color: 'var(--color-text)',
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
  flex: 1,
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
  flex: 1,
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
