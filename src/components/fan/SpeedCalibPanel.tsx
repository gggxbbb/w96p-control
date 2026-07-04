import { useState, useEffect, useRef, useCallback } from 'react';
import { useBle } from '../../hooks/useBle';
import { useDeviceStore } from '../../stores/device';
import { useToastStore } from '../../stores/toast';
import { defaultSpeeds } from '@gggxbbb/w96p-ble-sdk';
import { Card } from '../ui/Card';

function isNonDecreasing(nums: number[]): boolean {
  for (let i = 1; i < nums.length; i++) {
    if (nums[i] < nums[i - 1]) return false;
  }
  return true;
}

/** 连锁传播保证非递减：向右拉平、向左压平 */
function enforceOrder(nums: number[]): number[] {
  const next = [...nums];
  for (let i = 1; i < next.length; i++) {
    if (next[i] < next[i - 1]) next[i] = next[i - 1];
  }
  for (let i = next.length - 2; i >= 0; i--) {
    if (next[i] > next[i + 1]) next[i] = next[i + 1];
  }
  return next;
}

/** 四点拖拽滑块 */
function GearSlider({ values, onChange }: { values: number[]; onChange: (i: number, v: number) => void }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<number | null>(null);

  const toPercent = (v: number) => v;
  const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

  const getValueFromClientX = useCallback((clientX: number) => {
    const el = trackRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const ratio = (clientX - rect.left) / rect.width;
    return clamp(ratio * 100);
  }, []);

  const onPointerDown = (i: number) => (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragging.current = i;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (dragging.current === null) return;
    const i = dragging.current;
    const v = getValueFromClientX(e.clientX);
    // 保持顺序：不越过相邻点
    if (i > 0 && v < values[i - 1]) {
      onChange(i, values[i - 1]);
    } else if (i < 3 && v > values[i + 1]) {
      onChange(i, values[i + 1]);
    } else {
      onChange(i, v);
    }
  };

  const onPointerUp = (_e: React.PointerEvent) => {
    dragging.current = null;
  };

  return (
    <div
      ref={trackRef}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{
        position: 'relative',
        height: '40px',
        margin: '0 8px',
        cursor: 'pointer',
        touchAction: 'none',
        userSelect: 'none',
      }}
    >
      {/* 轨道 */}
      <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '4px', transform: 'translateY(-50%)', borderRadius: '2px', background: 'var(--color-bg-inset)' }} />
      {/* 填充段 */}
      <div style={{ position: 'absolute', top: '50%', left: `${toPercent(values[0])}%`, width: `${toPercent(values[3]) - toPercent(values[0])}%`, height: '4px', transform: 'translateY(-50%)', borderRadius: '2px', background: 'var(--color-accent)', opacity: 0.4 }} />
      {/* 拖拽点 */}
      {values.map((v, i) => (
        <div
          key={i}
          onPointerDown={onPointerDown(i)}
          style={{
            position: 'absolute', top: '50%', left: `calc(${toPercent(v)}% - 12px)`, transform: 'translateY(-50%)',
            width: '24px', height: '24px', borderRadius: '50%',
            background: 'var(--color-accent)', border: '2px solid var(--color-bg-surface)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.3)', zIndex: dragging.current === i ? 2 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '9px', color: '#fff', fontWeight: 600,
          }}
        >
          {i + 1}
        </div>
      ))}
      {/* 刻度 */}
      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--color-text-dim)', marginTop: '2px' }}>
        <span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
      </div>
    </div>
  );
}

export function SpeedCalibPanel() {
  const { isCompatMode, setSpeedCalib } = useBle();
  const speedCalib = useDeviceStore((s) => s.speedCalib);
  const show = useToastStore((s) => s.show);

  const [speeds, setSpeeds] = useState<number[]>([...speedCalib]);
  const [inputs, setInputs] = useState<string[]>(['', '', '', '']);
  const [advanced, setAdvanced] = useState(false);

  useEffect(() => {
    setSpeeds([...speedCalib]);
    setInputs(speedCalib.map(String));
  }, [speedCalib]);

  const disordered = !isNonDecreasing(speeds);

  useEffect(() => {
    if (disordered && !advanced) setAdvanced(true);
  }, [disordered, advanced]);

  const defaults = defaultSpeeds(isCompatMode);

  // ===== 滑块模式 =====
  const handleSliderChange = (i: number, v: number) => {
    const next = [...speeds];
    next[i] = v;
    const ordered = enforceOrder(next);
    setSpeeds(ordered);
  };

  // ===== 高级输入框模式 =====
  const handleInputChange = (i: number, raw: string) => {
    const nextInputs = [...inputs];
    nextInputs[i] = raw;
    setInputs(nextInputs);
  };

  const apply = () => {
    if (advanced) {
      const nums = inputs.map((s) => {
        const v = parseInt(s, 10);
        return Math.max(0, Math.min(100, isNaN(v) ? 0 : v));
      });
      setSpeedCalib(nums as [number, number, number, number]);
      setSpeeds(nums);
    } else {
      setSpeedCalib(speeds as [number, number, number, number]);
    }
    show('档位风速已应用');
  };

  const reset = () => {
    setSpeeds([...defaults]);
    setInputs(defaults.map(String));
    setSpeedCalib(defaults as [number, number, number, number]);
    setAdvanced(false);
    show('已恢复默认档位风速');
  };

  const tryExitAdvanced = () => {
    const nums = inputs.map((s) => {
      const v = parseInt(s, 10);
      return isNaN(v) ? 0 : v;
    });
    if (isNonDecreasing(nums)) {
      setSpeeds(nums);
      setAdvanced(false);
    } else {
      show('档位顺序不正确，无法退出高级模式');
    }
  };

  const toggleAdvanced = () => {
    if (advanced) {
      tryExitAdvanced();
    } else {
      setInputs(speeds.map(String));
      setAdvanced(true);
    }
  };

  return (
    <Card
      title="档位风速校准"
      actions={advanced ? <span style={{ fontSize: '10px', color: 'var(--color-warning)' }}>高级</span> : undefined}
    >
      {advanced ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', minWidth: '32px' }}>{i + 1}档</span>
              <input
                type="number"
                min={0}
                max={100}
                value={inputs[i]}
                onChange={(e) => handleInputChange(i, e.target.value)}
                style={numberInputStyle}
              />
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>%</span>
            </div>
          ))}
        </div>
      ) : (
        <>
          <GearSlider values={speeds} onChange={handleSliderChange} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '4px', margin: '4px 0 10px' }}>
            {speeds.map((v, i) => (
              <div key={i} style={{ textAlign: 'center', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                {i + 1}档 {v}%
              </div>
            ))}
          </div>
        </>
      )}
      <div style={{ display: 'flex', gap: '6px' }}>
        <button onClick={apply} style={primaryBtnStyle}>应用</button>
        <button onClick={reset} style={presetBtnStyle}>恢复默认</button>
        <div style={{ flex: 1 }} />
        <button onClick={toggleAdvanced} style={presetBtnStyle}>
          {advanced ? '退出高级模式' : '高级编辑'}
        </button>
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
  background: 'var(--color-success)', color: 'var(--color-bg-page)', border: 'none',
  borderRadius: '4px', padding: '6px 12px', fontSize: '11px',
  fontFamily: 'var(--font-sans)', cursor: 'pointer',
};

const presetBtnStyle: React.CSSProperties = {
  background: 'transparent', color: 'var(--color-text-muted)',
  border: '0.5px solid var(--color-border-strong)', borderRadius: '4px',
  padding: '6px 12px', fontSize: '11px', fontFamily: 'var(--font-sans)', cursor: 'pointer',
};
