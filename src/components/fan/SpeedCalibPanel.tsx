import { useState, useEffect, useRef, useCallback } from 'react';
import { useBle } from '../../hooks/useBle';
import { useDeviceStore } from '../../stores/device';
import { useToastStore } from '../../stores/toast';
import { Card } from '../ui/Card';

/** 拖拽四个点的档位滑块 */
function GearSlider({ values, onChange }: { values: number[]; onChange: (i: number, v: number) => void }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<number | null>(null); // 当前拖拽的点索引

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
    // 保持顺序：不能越过相邻点
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
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: 0,
          right: 0,
          height: '4px',
          transform: 'translateY(-50%)',
          borderRadius: '2px',
          background: 'var(--color-bg-inset)',
        }}
      />
      {/* 已填充段 */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: `${toPercent(values[0])}%`,
          width: `${toPercent(values[3]) - toPercent(values[0])}%`,
          height: '4px',
          transform: 'translateY(-50%)',
          borderRadius: '2px',
          background: 'var(--color-accent)',
          opacity: 0.4,
        }}
      />
      {/* 四个拖拽点 */}
      {values.map((v, i) => (
        <div
          key={i}
          onPointerDown={onPointerDown(i)}
          style={{
            position: 'absolute',
            top: '50%',
            left: `calc(${toPercent(v)}% - 12px)`,
            transform: 'translateY(-50%)',
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: 'var(--color-accent)',
            border: '2px solid var(--color-bg-surface)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
            zIndex: dragging.current === i ? 2 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '9px',
            color: '#fff',
            fontWeight: 600,
          }}
        >
          {i + 1}
        </div>
      ))}
      {/* 刻度标签 */}
      <div style={{
        position: 'absolute', top: '100%', left: 0, right: 0,
        display: 'flex', justifyContent: 'space-between',
        fontSize: '9px', color: 'var(--color-text-dim)', marginTop: '2px',
      }}>
        <span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
      </div>
    </div>
  );
}

export function SpeedCalibPanel() {
  const { profile, setSpeedCalib } = useBle();
  const speedCalib = useDeviceStore((s) => s.speedCalib);
  const show = useToastStore((s) => s.show);
  const [speeds, setSpeeds] = useState<number[]>([...speedCalib]);

  useEffect(() => { setSpeeds([...speedCalib]); }, [speedCalib]);

  const defaults = profile?.defaultSpeeds ?? [30, 50, 70, 100];

  const updateSpeed = (i: number, v: number) => {
    const next = [...speeds];
    next[i] = v;
    setSpeeds(next);
  };

  const apply = () => {
    setSpeedCalib(speeds as [number, number, number, number]);
    show('档位风速已应用');
  };
  const reset = () => {
    setSpeeds([...defaults]);
    setSpeedCalib([...defaults] as [number, number, number, number]);
    show('已恢复默认档位风速');
  };

  return (
    <Card title="档位风速校准">
      <GearSlider values={speeds} onChange={updateSpeed} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '4px', margin: '4px 0 10px' }}>
        {speeds.map((v, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: '11px', color: 'var(--color-text-muted)' }}>
            {i + 1}档 {v}%
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
