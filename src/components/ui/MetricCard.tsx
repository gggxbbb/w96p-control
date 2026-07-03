import { type ReactNode } from 'react';
import GaugeComponent from 'react-gauge-component';
import { useEditMode } from './EditModeContext';
import { useMetricCardStore } from '../../stores/metricCard';

interface MetricCardProps {
  label: string;
  value: number | string;
  unit?: string;
  rawValue?: number;
  decimals?: number;
  /** 数值范围 + 着色。不传则不着色、不可切仪表。 */
  range?: { min: number; max: number; dangerLow?: boolean };
  /** 禁止仪表模式 */
  noGauge?: boolean;
  /** 持久化 key，不传则不记忆切换状态 */
  persistKey?: string;
  style?: React.CSSProperties;
  className?: string;
  children?: ReactNode;
}

function getColor(v: number, min: number, max: number, dangerLow?: boolean): string {
  if (Number.isNaN(v)) return 'var(--color-text)';
  const r = max - min || 1;
  const p = dangerLow ? 1 - (v - min) / r : (v - min) / r;
  if (p >= 0.9) return 'var(--color-danger)';
  if (p >= 0.7) return 'var(--color-warning)';
  return 'var(--color-text)';
}

type Variant = 'number' | 'gauge';

export function MetricCard({ label, value, unit, rawValue, decimals, range, noGauge = false, persistKey, style, className, children }: MetricCardProps) {
  const editable = useEditMode();
  const variant = useMetricCardStore((s) => (persistKey ? s.variants[persistKey] : undefined) ?? 'number');
  const setVariant = useMetricCardStore((s) => s.setVariant);
  const canGauge = !!range && !noGauge;

  const num = rawValue ?? (typeof value === 'number' ? value : parseFloat(String(value)));
  const showGauge = canGauge && variant === 'gauge' && !Number.isNaN(num);

  const dv = decimals !== undefined && typeof value === 'number' ? value.toFixed(decimals) : String(value);
  const u = unit ?? (typeof value === 'string' ? String(value).replace(/^-?[\d.]+/, '').trim() : undefined);

  const min = range?.min ?? 0;
  const max = range?.max ?? 100;
  const dl = range?.dangerLow ?? false;
  const color = range ? getColor(num, min, max, dl) : 'var(--color-text)';

  return (
    <div className={className} style={{ background: 'var(--color-bg-surface)', border: '0.5px solid var(--color-border)', borderRadius: '6px', padding: '6px 12px 10px', height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', position: 'relative', ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
        <span style={{ color: 'var(--color-text-muted)', fontSize: '10px', letterSpacing: '0.05em', flex: 1, minWidth: 0, padding: '2px 0' }}>{label}</span>
        {editable && canGauge && (
          <button onClick={() => { const next: Variant = variant === 'gauge' ? 'number' : 'gauge'; setVariant(persistKey!, next); }} title={variant === 'gauge' ? '切换为数字' : '切换为仪表'} style={tb}>
            {variant === 'gauge' ? '#' : '◔'}
          </button>
        )}
      </div>
      {showGauge ? (
        <Gauge value={num} min={min} max={max} unit={u} color={color} dangerLow={dl} />
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 500, color, fontVariantNumeric: 'tabular-nums', lineHeight: 1.2, overflow: 'hidden', minHeight: 0 }}>
          <span style={{ fontSize: `clamp(14px, ${Math.max(18, 42 - dv.length * 3)}px, 26px)`, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {dv}{unit && <span style={{ fontSize: 'clamp(10px, 60%, 16px)', color: 'var(--color-text-muted)', marginLeft: '2px', fontWeight: 400 }}>{unit}</span>}
          </span>
        </div>
      )}
      {children}
    </div>
  );
}

/* ====== Gauge ====== */

function fmt(n: number) { return Number.isInteger(n) ? String(n) : n.toFixed(1); }
function fl(n: number) { const a = Math.abs(n), s = n < 0 ? '-' : ''; if (a >= 10000) return s + (a / 1000).toFixed(0) + 'k'; if (a >= 1000) { const v = a / 1000; return s + (Number.isInteger(v) ? v + 'k' : v.toFixed(1) + 'k'); } return fmt(n); }

function arcs(min: number, max: number, dl?: boolean) {
  const r = max - min || 1, t = 'var(--color-text)', w = 'var(--color-warning)', d = 'var(--color-danger)';
  if (min < 0) return [{ limit: min + r * .3, color: t }, { limit: 0, color: t }, { limit: min + r * .7, color: t }, { limit: min + r * .9, color: w }, { limit: max, color: d }];
  if (dl) return [{ limit: min + r * .1, color: d }, { limit: min + r * .3, color: w }, { limit: max, color: t }];
  return [{ limit: min + r * .7, color: t }, { limit: min + r * .9, color: w }, { limit: max, color: d }];
}

function Gauge({ value: v, min, max, unit: u, color: c, dangerLow: dl }: { value: number; min: number; max: number; unit?: string; color: string; dangerLow?: boolean }) {
  const s = fmt(v);
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px', overflow: 'hidden' }}>
      <div style={{ width: '100%', maxWidth: '140px', flexShrink: 0, aspectRatio: '2/1' }}>
        <GaugeComponent type="semicircle" value={v} minValue={min} maxValue={max}
          arc={{ subArcs: arcs(min, max, dl), padding: 0.02, width: 0.18, cornerRadius: 2 }}
          labels={{ valueLabel: { hide: true }, tickLabels: { type: 'outer', defaultTickValueConfig: { formatTextValue: (x: string) => fl(Number(x)), style: { fontSize: '8px', fill: 'var(--color-text-dim)', fontFamily: 'var(--font-sans)' } } } }}
          pointer={{ type: 'needle', color: c, elastic: true, animationDuration: 500, baseColor: 'var(--color-text-dim)' }} marginInPercent={0.08} />
      </div>
      <div style={{ fontSize: `clamp(12px, ${Math.max(14, 28 - s.length * 2)}px, 22px)`, fontWeight: 500, color: c, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
        {s}{u && <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginLeft: '2px', fontWeight: 400 }}>{u}</span>}
      </div>
    </div>
  );
}

const tb: React.CSSProperties = { background: 'var(--color-bg-inset)', border: '0.5px solid var(--color-border)', borderRadius: '3px', width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text-dim)', fontSize: 10, padding: 0, lineHeight: 1, flexShrink: 0 };
