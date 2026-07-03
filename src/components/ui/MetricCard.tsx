import { useState, useEffect, type ReactNode } from 'react';
import GaugeComponent from 'react-gauge-component';

interface GaugeConfig {
  min: number;
  max: number;
  /** 低端为危险区（如电压、电量越低越危险），默认高端为危险区 */
  dangerLow?: boolean;
}

interface MetricCardProps {
  label: string;
  value: number | string;
  unit?: string;
  /** 着色用的原始数值，避免 display value 被格式化后 parse 出错误量级 */
  rawValue?: number;
  /** 数值小数位数（仅当 value 为 number 且无 rawValue 时生效），默认不截断 */
  decimals?: number;
  /** 数值范围 + 着色配置。不传则不着色、不显示仪表切换。 */
  range?: GaugeConfig;
  /** 禁用仪表模式（始终数字显示） */
  noGauge?: boolean;
  /** 持久化标识：不同页面的同名卡片使用不同 key */
  persistKey?: string;
  style?: React.CSSProperties;
  className?: string;
  children?: ReactNode;
}

/* ========= 着色逻辑（数字和仪表共用） ========= */

function getColor(numericValue: number, min: number, max: number, dangerLow?: boolean): string {
  if (Number.isNaN(numericValue)) return 'var(--color-text)';
  const range = max - min || 1;
  const pct = dangerLow ? 1 - ((numericValue - min) / range) : (numericValue - min) / range;
  if (pct >= 0.9) return 'var(--color-danger)';
  if (pct >= 0.7) return 'var(--color-warning)';
  return 'var(--color-text)';
}

/* ========= 持久化 hook ========= */

type Variant = 'number' | 'gauge';

function usePersistedVariant(key: string | undefined, defaultVariant: Variant): [Variant, (v: Variant) => void] {
  const [variant, setVariant] = useState<Variant>(() => {
    if (!key) return defaultVariant;
    try {
      const stored = localStorage.getItem(`metric-mode-${key}`);
      return stored === 'gauge' || stored === 'number' ? stored : defaultVariant;
    } catch {
      return defaultVariant;
    }
  });

  useEffect(() => {
    if (!key) return;
    try {
      localStorage.setItem(`metric-mode-${key}`, variant);
    } catch { /* quota exceeded, ignore */ }
  }, [key, variant]);

  return [variant, setVariant];
}

/* ========= 组件 ========= */

export function MetricCard({
  label,
  value,
  unit,
  rawValue,
  decimals,
  range,
  noGauge = false,
  persistKey,
  style,
  className,
  children,
}: MetricCardProps) {
  const hasGauge = !!range && !noGauge;
  const [variant, setVariant] = usePersistedVariant(
    hasGauge ? persistKey : undefined,
    'number',
  );

  const numericValue = rawValue ?? (typeof value === 'number' ? value : parseFloat(String(value)));
  const showGauge = hasGauge && variant === 'gauge' && !Number.isNaN(numericValue);

  const displayValue: string =
    decimals !== undefined && typeof value === 'number'
      ? value.toFixed(decimals)
      : String(value);

  const effectiveUnit = unit ?? (typeof value === 'string' ? String(value).replace(/^-?[\d.]+/, '').trim() : undefined);

  const min = range?.min ?? 0;
  const max = range?.max ?? 100;
  const dangerLow = range?.dangerLow ?? false;
  const color = range
    ? getColor(numericValue, min, max, dangerLow)
    : 'var(--color-text)';

  return (
    <div
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
      {/* label + 切换按钮 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
        <span style={{ color: 'var(--color-text-muted)', fontSize: '10px', letterSpacing: '0.05em', flex: 1, minWidth: 0, padding: '2px 0' }}>
          {label}
        </span>
        {hasGauge && (
          <button
            onClick={() => setVariant(variant === 'gauge' ? 'number' : 'gauge')}
            title={variant === 'gauge' ? '切换为数字' : '切换为仪表'}
            style={toggleBtnStyle}
          >
            {variant === 'gauge' ? '#' : '◔'}
          </button>
        )}
      </div>

      {showGauge ? (
        <Gauge value={numericValue} min={min} max={max} unit={effectiveUnit} color={color} dangerLow={dangerLow} />
      ) : (
        <div
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 500, color, fontVariantNumeric: 'tabular-nums',
            lineHeight: 1.2, overflow: 'hidden', minHeight: 0,
          }}
        >
          <span style={{ fontSize: `clamp(14px, ${Math.max(18, 42 - displayValue.length * 3)}px, 26px)`, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {displayValue}
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
}

/* ========= Gauge 子组件 ========= */

function fmtNum(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(1);
}

function fmtLabel(n: number): string {
  const absN = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (absN >= 10000) return sign + (absN / 1000).toFixed(0) + 'k';
  if (absN >= 1000) {
    const v = absN / 1000;
    return sign + (Number.isInteger(v) ? v + 'k' : v.toFixed(1) + 'k');
  }
  return fmtNum(n);
}

function buildSubArcs(min: number, max: number, dangerLow?: boolean): { limit: number; color: string }[] {
  const range = max - min || 1;
  const txt = 'var(--color-text)';
  const warn = 'var(--color-warning)';
  const danger = 'var(--color-danger)';

  if (min < 0) {
    const mid = 0;
    return [
      { limit: min + range * 0.3, color: txt },
      { limit: mid, color: txt },
      { limit: min + range * 0.7, color: txt },
      { limit: min + range * 0.9, color: warn },
      { limit: max, color: danger },
    ];
  }
  if (dangerLow) {
    return [
      { limit: min + range * 0.1, color: danger },
      { limit: min + range * 0.3, color: warn },
      { limit: max, color: txt },
    ];
  }
  return [
    { limit: min + range * 0.7, color: txt },
    { limit: min + range * 0.9, color: warn },
    { limit: max, color: danger },
  ];
}

function Gauge({ value, min, max, unit, color, dangerLow }: { value: number; min: number; max: number; unit?: string; color: string; dangerLow?: boolean }) {
  const valueStr = fmtNum(value);
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px', overflow: 'hidden' }}>
      <div style={{ width: '100%', maxWidth: '140px', flexShrink: 0, minHeight: 0, aspectRatio: '2/1' }}>
        <GaugeComponent
          type="semicircle"
          value={value}
          minValue={min}
          maxValue={max}
          arc={{ subArcs: buildSubArcs(min, max, dangerLow), padding: 0.02, width: 0.18, cornerRadius: 2 }}
          labels={{
            valueLabel: { hide: true },
            tickLabels: { type: 'outer', defaultTickValueConfig: { formatTextValue: (v: string) => fmtLabel(Number(v)), style: { fontSize: '8px', fill: 'var(--color-text-dim)', fontFamily: 'var(--font-sans)' } } },
          }}
          pointer={{ type: 'needle', color, elastic: true, animationDuration: 500, baseColor: 'var(--color-text-dim)' }}
          marginInPercent={0.08}
        />
      </div>
      <div style={{ fontSize: `clamp(12px, ${Math.max(14, 28 - valueStr.length * 2)}px, 22px)`, fontWeight: 500, color, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
        {valueStr}
        {unit && <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginLeft: '2px', fontWeight: 400 }}>{unit}</span>}
      </div>
    </div>
  );
}

const toggleBtnStyle: React.CSSProperties = {
  background: 'var(--color-bg-inset)',
  border: '0.5px solid var(--color-border)',
  borderRadius: '3px',
  width: '20px', height: '20px',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', color: 'var(--color-text-dim)', fontSize: '10px',
  padding: 0, lineHeight: 1, flexShrink: 0,
};
