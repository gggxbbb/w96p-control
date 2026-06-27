import { forwardRef } from 'react';

type Accent = 'default' | 'success' | 'warning' | 'danger';
type Variant = 'number' | 'gauge';

interface MetricCardProps {
  label: string;
  value: number | string;
  unit?: string;
  accent?: Accent;
  /** 展示变体：number（默认数字）| gauge（弧形仪表） */
  variant?: Variant;
  /** gauge 模式：最小值，默认 0 */
  min?: number;
  /** gauge 模式：最大值，默认 100 */
  max?: number;
  style?: React.CSSProperties;
  className?: string;
}

const accentColor: Record<Accent, string> = {
  default: 'var(--color-text)',
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  danger: 'var(--color-danger)',
};

export const MetricCard = forwardRef<HTMLDivElement, MetricCardProps>(function MetricCard(
  { label, value, unit, accent = 'default', variant = 'number', min = 0, max = 100, style, className, ...rest },
  ref,
) {
  const numericValue = typeof value === 'number' ? value : NaN;
  const showGauge = variant === 'gauge' && !Number.isNaN(numericValue);

  return (
    <div
      ref={ref}
      {...rest}
      className={className ? `drag-handle ${className}` : 'drag-handle'}
      style={{
        background: 'var(--color-bg-surface)',
        border: '0.5px solid var(--color-border)',
        borderRadius: '6px',
        padding: '10px 12px',
        height: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        ...style,
      }}
    >
      <div
        style={{
          color: 'var(--color-text-muted)',
          fontSize: '10px',
          letterSpacing: '0.05em',
          marginBottom: '4px',
          flexShrink: 0,
        }}
      >
        {label}
      </div>

      {showGauge ? (
        <Gauge value={numericValue} min={min} max={max} unit={unit} accent={accent} />
      ) : (
        <div
          style={{
            fontSize: '22px',
            fontWeight: 500,
            color: accentColor[accent],
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1.2,
          }}
        >
          {value}
          {unit && (
            <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginLeft: '2px' }}>
              {unit}
            </span>
          )}
        </div>
      )}
    </div>
  );
});

/* ========= Gauge 子组件 ========= */

interface GaugeProps {
  value: number;
  min: number;
  max: number;
  unit?: string;
  accent: Accent;
}

function Gauge({ value, min, max, unit, accent }: GaugeProps) {
  const range = max - min || 1;
  const pct = Math.max(0, Math.min(1, (value - min) / range));
  const color = accentColor[accent];

  // 弧形参数：半径 40，线宽 5，起始角 225°，扫角 270°
  const cx = 52;
  const cy = 48;
  const r = 36;
  const strokeW = 5;
  const startAngle = -225; // SVG 坐标系（上= -90°）顺时针； -225° = 左下 135°（传统仪表起点）
  const sweep = 270;       // 扫过 270°

  const arcPath = (fromDeg: number, toDeg: number) => {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const s = toRad(fromDeg);
    const e = toRad(toDeg);
    const x1 = cx + r * Math.cos(s);
    const y1 = cy + r * Math.sin(s);
    const x2 = cx + r * Math.cos(e);
    const y2 = cy + r * Math.sin(e);
    const large = e - s > Math.PI ? 1 : 0;
    return `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  };

  const bgArc = arcPath(startAngle, startAngle + sweep);
  const fillAngle = startAngle + sweep * pct;
  const fillArc = pct > 0 ? arcPath(startAngle, fillAngle) : undefined;

  // 计算刻度标签位置（min / max）
  const tickRadius = r - strokeW - 2;
  const labelPos = (deg: number) => {
    const rad = (deg * Math.PI) / 180;
    return {
      x: cx + tickRadius * Math.cos(rad),
      y: cy + tickRadius * Math.sin(rad) + 3, // +3 用于垂直居中调整
    };
  };
  const minPos = labelPos(startAngle);
  const maxPos = labelPos(startAngle + sweep);

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <svg viewBox="0 0 104 60" style={{ width: '100%', maxWidth: '130px', display: 'block' }}>
        {/* 底色弧 */}
        <path
          d={bgArc}
          fill="none"
          stroke="var(--color-bg-page)"
          strokeWidth={strokeW}
          strokeLinecap="round"
        />
        {/* 值弧 */}
        {fillArc && (
          <path
            d={fillArc}
            fill="none"
            stroke={color}
            strokeWidth={strokeW}
            strokeLinecap="round"
          />
        )}
        {/* 刻度文字 */}
        <text x={minPos.x.toFixed(0)} y={minPos.y.toFixed(0)} textAnchor="middle" fontSize="7" fill="var(--color-text-dim)">
          {min}
        </text>
        <text x={maxPos.x.toFixed(0)} y={maxPos.y.toFixed(0)} textAnchor="middle" fontSize="7" fill="var(--color-text-dim)">
          {max}
        </text>
      </svg>

      {/* 中心数值 */}
      <div
        style={{
          fontSize: '18px',
          fontWeight: 500,
          color,
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1.1,
          marginTop: '-30px',
          textAlign: 'center',
        }}
      >
        {value}
        {unit && (
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginLeft: '2px' }}>
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}
