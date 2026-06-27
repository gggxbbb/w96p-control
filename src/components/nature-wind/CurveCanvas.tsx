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

export function CurveCanvas({ points, onChange, min, max }: CurveCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [size, setSize] = useState({ w: 600, h: 120 });

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
    const colorText = readColor('--color-text', '#E8E7E2');

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
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    points.forEach((v, i) => {
      const x = (i / 127) * w;
      const y = h - ((v - min) / range) * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // 拖拽点高亮
    if (dragIndex !== null) {
      const x = (dragIndex / 127) * w;
      const v = points[dragIndex];
      const y = h - ((v - min) / range) * h;
      ctx.fillStyle = colorText;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [points, dragIndex, size, min, max]);

  useEffect(() => {
    draw();
  }, [draw]);

  const findNearestIndex = (x: number): number => {
    return Math.max(0, Math.min(127, Math.round((x / size.w) * 127)));
  };

  const yToValue = (y: number): number => {
    const range = max - min || 1;
    const v = min + (1 - y / size.h) * range;
    return Math.round(Math.max(min, Math.min(max, v)));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const idx = findNearestIndex(x);
    setDragIndex(idx);
    // 立即应用按下位置的 y 值，提升手感
    const y = e.clientY - rect.top;
    const v = yToValue(y);
    if (points[idx] !== v) {
      const next = [...points];
      next[idx] = v;
      onChange(next);
    }
    canvasRef.current.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragIndex === null || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const v = yToValue(y);
    if (points[dragIndex] !== v) {
      const next = [...points];
      next[dragIndex] = v;
      onChange(next);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setDragIndex(null);
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
