import { useRef, useCallback, useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface ArcSliderProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}

const ARC_WIDTH = 280;

export function ArcSlider({
  value,
  min = 0,
  max = 100,
  onChange,
  disabled,
}: ArcSliderProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState(false);

  const pctToValue = useCallback(
    (pct: number) => Math.round(min + pct * (max - min)),
    [min, max],
  );

  const handlePointer = useCallback(
    (clientX: number) => {
      if (!svgRef.current || disabled) return;
      const rect = svgRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const pct = Math.max(0, Math.min(1, x / rect.width));
      onChange(pctToValue(pct));
    },
    [onChange, pctToValue, disabled],
  );

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => handlePointer(e.clientX);
    const onUp = () => setDragging(false);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [dragging, handlePointer]);

  const progress = (value - min) / (max - min);
  const thumbX = progress * ARC_WIDTH;
  const THUMB_SIZE = 28;

  // 弧形参数
  const h = 48;
  const w = ARC_WIDTH;
  const arcR = 180;

  return (
    <div
      style={{
        width: w,
        margin: '0 auto',
        position: 'relative',
        height: h + 24,
        touchAction: 'none',
      }}
    >
      <svg
        ref={svgRef}
        width={w}
        height={h + 24}
        style={{
          overflow: 'visible',
          cursor: disabled ? 'default' : 'pointer',
        }}
        onPointerDown={(e) => {
          setDragging(true);
          handlePointer(e.clientX);
        }}
      >
        <defs>
          <linearGradient id="arc-slider-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--color-accent-start)" />
            <stop offset="100%" stopColor="var(--color-accent-end)" />
          </linearGradient>
        </defs>

        {/* 背景轨道 */}
        <path
          d={`M 0 ${h} Q ${w / 2} ${-arcR + h} ${w} ${h}`}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={4}
          strokeLinecap="round"
        />

        {/* 激活轨道 */}
        <motion.path
          d={`M 0 ${h} Q ${w / 2} ${-arcR + h} ${w} ${h}`}
          fill="none"
          stroke="url(#arc-slider-grad)"
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={w * 1.5}
          animate={{ strokeDashoffset: (1 - progress) * w * 1.5 }}
          transition={{ duration: 0.3 }}
        />
      </svg>

      {/* 拖拽点 */}
      <motion.div
        animate={{ left: thumbX - THUMB_SIZE / 2 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        style={{
          position: 'absolute',
          top: h - THUMB_SIZE / 2 + 6,
          width: THUMB_SIZE,
          height: THUMB_SIZE,
          borderRadius: '50%',
          background: 'var(--color-surface)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '2px solid rgba(255,255,255,0.2)',
          boxShadow:
            '0 2px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
          pointerEvents: 'none',
          zIndex: 2,
        }}
      />
    </div>
  );
}
