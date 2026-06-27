import { forwardRef, useState } from 'react';
import { useMetricStore } from '../../stores/metricConfig';
import { useEditMode } from './EditModeContext';

type Accent = 'default' | 'success' | 'warning' | 'danger';

interface MetricCardProps {
  label: string;
  value: number | string;
  unit?: string;
  accent?: Accent;
  /** gauge 模式的最小值，默认 0 */
  gaugeMin?: number;
  /** gauge 模式的最大值，默认 100 */
  gaugeMax?: number;
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
  { label, value, unit, accent = 'default', gaugeMin = 0, gaugeMax = 100, style, className, ...rest },
  ref,
) {
  const editable = useEditMode();
  const variant = useMetricStore((s) => s.configs[label]?.variant ?? 'number');
  const storeMin = useMetricStore((s) => s.configs[label]?.min);
  const storeMax = useMetricStore((s) => s.configs[label]?.max);
  const setVariant = useMetricStore((s) => s.setVariant);
  const setRange = useMetricStore((s) => s.setRange);

  const numericValue = typeof value === 'number' ? value : NaN;
  const showGauge = variant === 'gauge' && !Number.isNaN(numericValue);

  const min = storeMin ?? gaugeMin;
  const max = storeMax ?? gaugeMax;

  const [configOpen, setConfigOpen] = useState(false);
  const [draftMin, setDraftMin] = useState(min);
  const [draftMax, setDraftMax] = useState(max);

  const openConfig = () => {
    setDraftMin(min);
    setDraftMax(max);
    setConfigOpen(true);
  };

  const applyConfig = () => {
    setRange(label, draftMin, draftMax);
    setConfigOpen(false);
  };

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
        position: 'relative',
        ...style,
      }}
    >
      {/* label row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '4px',
        }}
      >
        <span
          style={{
            color: 'var(--color-text-muted)',
            fontSize: '10px',
            letterSpacing: '0.05em',
          }}
        >
          {label}
        </span>

        {/* edit-mode buttons */}
        {editable && (
          <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }} className="no-drag">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setVariant(label, variant === 'gauge' ? 'number' : 'gauge');
              }}
              title={variant === 'gauge' ? '切换为数字' : '切换为仪表'}
              style={iconBtnStyle}
            >
              {variant === 'gauge' ? '#' : '◔'}
            </button>
            {variant === 'gauge' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openConfig();
                }}
                title="仪表范围"
                style={iconBtnStyle}
              >
                ⚙
              </button>
            )}
          </div>
        )}
      </div>

      {/* config popup — 固定定位避免被下方卡片遮挡 */}
      {configOpen && (
        <>
          <div
            className="no-drag"
            onClick={() => setConfigOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 999,
            }}
          />
          <div
            className="no-drag"
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 1000,
              background: 'var(--color-bg-surface)',
              border: '0.5px solid var(--color-border-strong)',
              borderRadius: '6px',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              fontSize: '12px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              minWidth: '180px',
            }}
          >
            <div style={{ color: 'var(--color-text-muted)', fontSize: '11px', marginBottom: '2px' }}>
              仪表范围 · {label}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-muted)' }}>
              <span style={{ width: '28px' }}>最小</span>
              <input
                type="number"
                value={draftMin}
                onChange={(e) => setDraftMin(Number(e.target.value))}
                style={inputStyle}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-muted)' }}>
              <span style={{ width: '28px' }}>最大</span>
              <input
                type="number"
                value={draftMax}
                onChange={(e) => setDraftMax(Number(e.target.value))}
                style={inputStyle}
              />
            </div>
            <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
              <button onClick={() => setConfigOpen(false)} style={{ ...applyBtnStyle, background: 'var(--color-bg-inset)', color: 'var(--color-text-muted)', flex: 1 }}>
                取消
              </button>
              <button onClick={applyConfig} style={{ ...applyBtnStyle, flex: 1 }}>
                确定
              </button>
            </div>
          </div>
        </>
      )}

      {/* value */}
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

/** 格式化数字：整数直接显示，小数保留 1 位 */
function fmtNum(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(1);
}

/** 格式化刻度标签：大数缩写为 k */
function fmtLabel(n: number): string {
  if (n >= 10000) return (n / 1000).toFixed(0) + 'k';
  if (n >= 1000) {
    const v = n / 1000;
    return Number.isInteger(v) ? v + 'k' : v.toFixed(1) + 'k';
  }
  return fmtNum(n);
}

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

  // 弧形参数：圆心下移给数字留空间
  const cx = 50;
  const cy = 42;
  const r = 30;
  const strokeW = 4;
  const startAngle = -225;
  const sweep = 270;

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

  const tickRadius = r - strokeW - 1;
  const labelPos = (deg: number) => {
    const rad = (deg * Math.PI) / 180;
    return {
      x: cx + tickRadius * Math.cos(rad),
      y: cy + tickRadius * Math.sin(rad) + 3,
    };
  };
  const minPos = labelPos(startAngle);
  const maxPos = labelPos(startAngle + sweep);

  const valueStr = fmtNum(value);
  const fontSize = valueStr.length > 4 ? '14px' : valueStr.length > 3 ? '16px' : '18px';

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
      <svg viewBox="0 0 100 46" style={{ width: '100%', maxWidth: '120px', display: 'block', flexShrink: 0 }}>
        <path
          d={bgArc}
          fill="none"
          stroke="var(--color-bg-page)"
          strokeWidth={strokeW}
          strokeLinecap="round"
        />
        {fillArc && (
          <path
            d={fillArc}
            fill="none"
            stroke={color}
            strokeWidth={strokeW}
            strokeLinecap="round"
          />
        )}
        <text x={minPos.x.toFixed(0)} y={minPos.y.toFixed(0)} textAnchor="middle" fontSize="7" fill="var(--color-text-dim)">
          {fmtLabel(min)}
        </text>
        <text x={maxPos.x.toFixed(0)} y={maxPos.y.toFixed(0)} textAnchor="middle" fontSize="7" fill="var(--color-text-dim)">
          {fmtLabel(max)}
        </text>
      </svg>

      {/* 中心数值（弧下方） */}
      <div
        style={{
          fontSize,
          fontWeight: 500,
          color,
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1.1,
          textAlign: 'center',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: '100%',
        }}
      >
        {valueStr}
        {unit && (
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginLeft: '2px', fontWeight: 400 }}>
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

/* ========= 内联样式 ========= */

const iconBtnStyle: React.CSSProperties = {
  background: 'var(--color-bg-inset)',
  border: '0.5px solid var(--color-border)',
  borderRadius: '3px',
  width: '20px',
  height: '20px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  color: 'var(--color-text-dim)',
  fontSize: '10px',
  padding: 0,
  lineHeight: 1,
};

const inputStyle: React.CSSProperties = {
  background: 'var(--color-bg-inset)',
  border: '0.5px solid var(--color-border)',
  borderRadius: '3px',
  color: 'var(--color-text)',
  padding: '2px 4px',
  fontSize: '11px',
  width: '56px',
  fontFamily: 'var(--font-sans)',
  fontVariantNumeric: 'tabular-nums',
};

const applyBtnStyle: React.CSSProperties = {
  background: 'var(--color-accent)',
  border: 'none',
  borderRadius: '4px',
  color: '#fff',
  padding: '5px 0',
  fontSize: '12px',
  cursor: 'pointer',
  fontFamily: 'var(--font-sans)',
};
