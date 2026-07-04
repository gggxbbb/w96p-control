import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { line, curveCardinal } from 'd3-shape';
import { GlassCard } from '../../components/ui/GlassCard';

function generateSineCurve(
  points: number,
  amplitude: number,
  frequency: number,
): number[] {
  return Array.from({ length: points }, (_, i) => {
    const t = (i / points) * Math.PI * 2 * frequency;
    return Math.round(
      Math.max(
        0,
        Math.min(
          100,
          (0.5 +
            Math.sin(t) * amplitude +
            Math.sin(t * 3) * amplitude * 0.3) *
            100,
        ),
      ),
    );
  });
}

const PRESETS: { name: string; description: string; curve: number[] }[] = [
  {
    name: '山林微风',
    description: '轻柔起伏，如林间清风',
    curve: generateSineCurve(128, 0.15, 0.3),
  },
  {
    name: '海边轻波',
    description: '规律波动，如潮汐般温柔',
    curve: generateSineCurve(128, 0.3, 1.5),
  },
  {
    name: '峡谷劲风',
    description: '强烈阵风，激情澎湃',
    curve: generateSineCurve(128, 0.6, 0.8),
  },
  {
    name: '草原阵风',
    description: '间歇性大风，草原的呼吸',
    curve: generateSineCurve(128, 0.45, 0.4),
  },
];

export default function NatureWindPage() {
  const [activePreset, setActivePreset] = useState<number>(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 600, h: 160 });

  const currentCurve = PRESETS[activePreset].curve;

  // 响应式 canvas 尺寸
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setCanvasSize({
          w: entry.contentRect.width,
          h: entry.contentRect.height,
        });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Canvas 绘制飘带曲线
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { w, h } = canvasSize;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, w, h);

    const lineGen = line<number>()
      .x((_, i) => (i / (currentCurve.length - 1)) * w)
      .y((d) => h - (d / 100) * h)
      .curve(curveCardinal);

    // 填充
    const pathStr = lineGen(currentCurve);
    if (pathStr) {
      const areaPath = new Path2D(pathStr);
      areaPath.lineTo(w, h);
      areaPath.lineTo(0, h);
      areaPath.closePath();

      const fillGrad = ctx.createLinearGradient(0, 0, 0, h);
      fillGrad.addColorStop(0, 'rgba(94,158,255,0.3)');
      fillGrad.addColorStop(1, 'rgba(94,158,255,0.02)');
      ctx.fillStyle = fillGrad;
      ctx.fill(areaPath);

      // 线条
      ctx.strokeStyle = 'rgba(94,158,255,0.8)';
      ctx.lineWidth = 2;
      ctx.stroke(new Path2D(pathStr));
    }
  }, [currentCurve, canvasSize]);

  const handlePresetSelect = useCallback((idx: number) => {
    setActivePreset(idx);
  }, []);

  return (
    <div
      style={{
        height: '100%',
        overflow: 'auto',
        padding: '40px 24px 100px',
      }}
    >
      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          fontSize: 20,
          fontWeight: 300,
          marginBottom: 8,
          color: 'var(--color-text)',
        }}
      >
        风之画卷
      </motion.h2>
      <p
        style={{
          fontSize: 13,
          color: 'var(--color-text-secondary)',
          marginBottom: 24,
        }}
      >
        选择一种风，感受自然的呼吸
      </p>

      {/* Canvas 飘带 */}
      <GlassCard
        style={{
          marginBottom: 24,
          padding: 0,
          overflow: 'hidden',
        }}
      >
        <div
          ref={containerRef}
          style={{ height: 160, position: 'relative' }}
        >
          <canvas
            ref={canvasRef}
            style={{
              width: '100%',
              height: '100%',
              display: 'block',
            }}
          />
        </div>
      </GlassCard>

      {/* 预制场景 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 10,
        }}
      >
        {PRESETS.map((preset, i) => (
          <GlassCard
            key={i}
            hoverable
            onClick={() => handlePresetSelect(i)}
            style={{
              padding: 16,
              cursor: 'pointer',
              border:
                activePreset === i
                  ? '1px solid var(--color-accent)'
                  : undefined,
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: 'var(--color-text)',
              }}
            >
              {preset.name}
            </div>
            <div
              style={{
                fontSize: 11,
                color: 'var(--color-text-tertiary)',
                marginTop: 4,
              }}
            >
              {preset.description}
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
