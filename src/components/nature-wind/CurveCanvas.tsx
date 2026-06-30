import { useRef, useEffect, useCallback, useState } from 'react';

interface CurveCanvasProps {
  points: number[];
  onChange: (points: number[]) => void;
  min: number;
  max: number;
}

// 读取 CSS 变量，附带 fallback 避免 Canvas API 接收空字符串
function readColor(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

/** 线性插值：从 (lastIdx, lastVal) 到 (idx, val) 之间的所有整数点 */
function interpolatePoints(
  points: number[],
  lastIdx: number,
  lastVal: number,
  idx: number,
  val: number,
  clampMin: number,
  clampMax: number,
) {
  const minIdx = Math.min(lastIdx, idx);
  const maxIdx = Math.max(lastIdx, idx);
  for (let i = minIdx; i <= maxIdx; i++) {
    const t = maxIdx === minIdx ? 0 : (i - minIdx) / (maxIdx - minIdx);
    let v: number;
    if (lastIdx <= idx) {
      v = lastVal + (val - lastVal) * t;
    } else {
      v = val + (lastVal - val) * t;
    }
    points[i] = Math.round(Math.max(clampMin, Math.min(clampMax, v)));
  }
}

export function CurveCanvas({ points, onChange, min, max }: CurveCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [size, setSize] = useState({ w: 600, h: 120 });
  // 上一次处理过的画布坐标和对应值，用于插值
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  // 响应容器宽度
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0].contentRect;
      setSize({ w: Math.max(120, cr.width), h: 120 });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const indexAt = (canvasX: number): number => {
    return Math.max(0, Math.min(127, Math.round((canvasX / size.w) * 127)));
  };

  const valueAt = (canvasY: number): number => {
    const range = max - min || 1;
    const v = min + (1 - canvasY / size.h) * range;
    return Math.round(Math.max(min, Math.min(max, v)));
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { w, h } = size;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const colorBgPage = readColor('--color-bg-page', '#1A1A18');
    const colorBgInset = readColor('--color-bg-inset', '#232320');
    const colorAccent = readColor('--color-accent', '#378ADD');

    // 背景
    ctx.fillStyle = colorBgPage;
    ctx.fillRect(0, 0, w, h);

    // 网格
    ctx.strokeStyle = colorBgInset;
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 8; i++) {
      const x = (i / 8) * w;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let j = 0; j <= 4; j++) {
      const y = (j / 4) * h;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    if (points.length !== 128) return;
    const range = max - min || 1;

    // 曲线
    ctx.strokeStyle = colorAccent;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    points.forEach((v, i) => {
      const x = (i / 127) * w;
      const y = h - ((v - min) / range) * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }, [points, size, min, max]);

  useEffect(() => {
    draw();
  }, [draw]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    canvasRef.current.setPointerCapture(e.pointerId);
    setIsDrawing(true);

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const idx = indexAt(x);
    const v = valueAt(y);

    lastPosRef.current = { x, y };

    if (points[idx] !== v) {
      const next = [...points];
      next[idx] = v;
      onChange(next);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const lastPos = lastPosRef.current;
    if (!lastPos) {
      lastPosRef.current = { x, y };
      return;
    }

    const newIdx = indexAt(x);
    const newVal = valueAt(y);
    const lastIdx = indexAt(lastPos.x);
    const lastVal = valueAt(lastPos.y);

    if (newIdx === lastIdx && newVal === lastVal) return;

    const next = [...points];
    if (Math.abs(newIdx - lastIdx) <= 1) {
      // 相邻或同点，直接设置
      next[newIdx] = newVal;
    } else {
      // 快速拖拽时线性插值填充中间点
      interpolatePoints(next, lastIdx, lastVal, newIdx, newVal, min, max);
    }
    lastPosRef.current = { x, y };
    onChange(next);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsDrawing(false);
    lastPosRef.current = null;
    canvasRef.current?.releasePointerCapture(e.pointerId);
  };

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          display: 'block',
          cursor: 'crosshair',
          touchAction: 'none',
          borderRadius: '4px',
        }}
      />
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '4px',
          fontSize: '10px',
          color: 'var(--color-text-dim)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        <span>0</span>
        <span>32</span>
        <span>64</span>
        <span>96</span>
        <span>127</span>
      </div>
    </div>
  );
}
