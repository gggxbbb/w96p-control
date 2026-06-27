import { forwardRef, useState, type ReactNode } from 'react';
import { useMetricStore } from '../../stores/metricConfig';
import { useEditMode } from './EditModeContext';

interface MetricCardProps {
  label: string;
  value: number | string;
  unit?: string;
  /** @deprecated 颜色现在按值百分比自动分区，不再使用此属性 */
  accent?: string;
  /** gauge 模式的最小值，默认 0 */
  gaugeMin?: number;
  /** gauge 模式的最大值，默认 100 */
  gaugeMax?: number;
  style?: React.CSSProperties;
  className?: string;
  children?: ReactNode;
}

/** 仪表模式下各类指标的合理默认范围 */
const GAUGE_PRESETS: Record<string, { min: number; max: number }> = {
  // 风扇
  '转速': { min: 0, max: 100 },
  // 电池
  '电池功率': { min: 0, max: 20 },
  '电池电压': { min: 3.0, max: 4.2 },
  // 电机
  '电机功率': { min: 0, max: 20 },
  '电机功率（近似）': { min: 0, max: 20 },
  '电机电流': { min: 0, max: 2000 },
  '电机电压': { min: 0, max: 12 },
  // 电源面板
  '电压': { min: 3.0, max: 4.2 },
  '电流': { min: 0, max: 2000 },
  '容量': { min: 0, max: 10000 },
  '功率': { min: 0, max: 20 },
  'VBUS 电压': { min: 0, max: 5.0 },
  'VBUS 电流': { min: 0, max: 3000 },
  'VBUS 功率': { min: 0, max: 20 },
};

const DEFAULT_GAUGE_RANGE = { min: 0, max: 100 };

/** 统一颜色：按值在 min-max 范围中的百分比分区 */
function getColor(numericValue: number, min: number, max: number): string {
  if (Number.isNaN(numericValue)) return 'var(--color-text)';
  const range = max - min || 1;
  const pct = (numericValue - min) / range;
  if (pct >= 0.9) return 'var(--color-danger)';
  if (pct >= 0.7) return 'var(--color-warning)';
  return 'var(--color-text)';
}

export const MetricCard = forwardRef<HTMLDivElement, MetricCardProps>(function MetricCard(
  { label, value, unit, accent: _accent, gaugeMin = 0, gaugeMax = 100, style, className, children, ...rest },
  ref,
) {
  const editable = useEditMode();
  const variant = useMetricStore((s) => s.configs[label]?.variant ?? 'number');
  const storeMin = useMetricStore((s) => s.configs[label]?.min);
  const storeMax = useMetricStore((s) => s.configs[label]?.max);
  const setVariant = useMetricStore((s) => s.setVariant);
  const setRange = useMetricStore((s) => s.setRange);

  const numericValue = typeof value === 'number' ? value : parseFloat(String(value));
  const showGauge = variant === 'gauge' && !Number.isNaN(numericValue);

  // 从字符串 value 中推断单位（如 "3.85 V" → "V"），显式 unit prop 优先
  const effectiveUnit = unit ?? (typeof value === 'string' ? String(value).replace(/^-?[\d.]+/, '').trim() : undefined);

  const min = storeMin ?? gaugeMin;
  const max = storeMax ?? gaugeMax;
  const color = getColor(numericValue, min, max);

  const [configOpen, setConfigOpen] = useState(false);
  const [draftMin, setDraftMin] = useState(min);
  const [draftMax, setDraftMax] = useState(max);

  const toggleVariant = () => {
    const next = variant === 'gauge' ? 'number' : 'gauge';
    setVariant(label, next);
    // 首次切换到 gauge 时应用预设范围
    if (next === 'gauge' && storeMin === undefined && storeMax === undefined) {
      const preset = GAUGE_PRESETS[label] ?? DEFAULT_GAUGE_RANGE;
      setRange(label, preset.min, preset.max);
    }
  };

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
      className={className}
      style={{
        background: 'var(--color-bg-surface)',
        border: '0.5px solid var(--color-border)',
        borderRadius: '6px',
        padding: '6px 12px 10px',
        height: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        ...style,
      }}
    >
      {/* drag handle strip + label + config buttons */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          marginBottom: '2px',
        }}
      >
        {/* drag handle — 包含手柄图标 + label，拖拽时抓这里 */}
        <div
          className="drag-handle"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            padding: '2px 0',
            flex: 1,
            minWidth: 0,
          }}
        >
          <svg
            className="drag-handle-icon"
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="currentColor"
            style={{ color: 'var(--color-text-dim)', display: 'block', flexShrink: 0 }}
          >
            <circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" />
            <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
            <circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" />
          </svg>
          <span
            style={{
              color: 'var(--color-text-muted)',
              fontSize: '10px',
              letterSpacing: '0.05em',
            }}
          >
            {label}
          </span>
        </div>

        {/* edit-mode buttons */}
        {editable && (
          <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }} className="no-drag">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleVariant();
              }}
              title={variant === 'gauge' ? '切换为数字' : '切换为仪表'}
              style={iconBtnStyle}
            >
              {variant === 'gauge' ? '#' : '◔'}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                openConfig();
              }}
              title="数值范围"
              style={iconBtnStyle}
            >
              ⚙
            </button>
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
        <Gauge value={numericValue} min={min} max={max} unit={effectiveUnit} color={color} />
      ) : (
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 500,
            color,
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1.2,
            overflow: 'hidden',
            minHeight: 0,
          }}
        >
          <span
            style={{
              fontSize: `clamp(14px, ${Math.max(18, 42 - String(value).length * 3)}px, 26px)`,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {value}
            {unit && (
              <span style={{ fontSize: 'clamp(10px, 60%, 16px)', color: 'var(--color-text-muted)', marginLeft: '2px', fontWeight: 400 }}>
                {unit}
              </span>
            )}
          </span>
        </div>
      )}
      {children}
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
  color: string;
}

function Gauge({ value, min, max, unit, color }: GaugeProps) {
  const range = max - min || 1;
  const pct = Math.max(0, Math.min(1, (value - min) / range));

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

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px', overflow: 'hidden' }}>
      <svg viewBox="0 0 100 46" style={{ width: '100%', maxWidth: '140px', flexShrink: 0, minHeight: 0 }} preserveAspectRatio="xMidYMid meet">
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
          fontSize: `clamp(12px, ${Math.max(14, 28 - valueStr.length * 2)}px, 22px)`,
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
