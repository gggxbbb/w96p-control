import { useState, type ReactNode } from 'react';
import GaugeComponent from 'react-gauge-component';
import { useMetricStore } from '../../stores/metricConfig';
import { useEditMode } from './EditModeContext';

interface MetricCardProps {
  label: string;
  value: number | string;
  unit?: string;
  /** 着色用的原始数值，避免 display value 被格式化后 parse 出错误量级 */
  rawValue?: number;
  /** 数值小数位数（仅当 value 为 number 且无 rawValue 时生效），默认不截断 */
  decimals?: number;
  /** @deprecated 颜色现在按值百分比自动分区，不再使用此属性 */
  accent?: string;
  /** gauge 模式的最小值，默认 0 */
  gaugeMin?: number;
  /** gauge 模式的最大值，默认 100 */
  gaugeMax?: number;
  /** 强制数字模式，禁用仪表切换（用于嵌套在面板内的 MetricCard） */
  noGauge?: boolean;
  style?: React.CSSProperties;
  className?: string;
  children?: ReactNode;
}

/** 仪表模式下各类指标的合理默认范围 */
const GAUGE_PRESETS: Record<string, { min: number; max: number; dangerLow?: boolean }> = {
  // 风扇
  '转速': { min: 0, max: 100 },
  // 电池 — 充电时电流/功率可为负
  '电池功率': { min: -20, max: 20 },
  '电池电压': { min: 3.0, max: 4.2, dangerLow: true },
  // 电机
  '电机功率': { min: 0, max: 20 },
  '电机功率（近似）': { min: 0, max: 20 },
  '电机电流': { min: 0, max: 5000 },
  '电机电压': { min: 0, max: 12 },
  // 电源面板 — 充/放电双向，电流/功率对称
  '电压': { min: 3.0, max: 4.2, dangerLow: true },
  '电流': { min: -5000, max: 5000 },
  '容量': { min: 10000, max: 20000, dangerLow: true },
  '功率': { min: -20, max: 20 },
  'VBUS 电压': { min: 0, max: 12 },
  'VBUS 电流': { min: -5000, max: 5000 },
  'VBUS 功率': { min: -20, max: 20 },
  // 电源管理
  '电量': { min: 0, max: 100, dangerLow: true },
  '电量(电压估算)': { min: 0, max: 100, dangerLow: true },
};

const DEFAULT_GAUGE_RANGE = { min: 0, max: 100 };

/** 不适合仪表模式的卡片标签 */
const NO_GAUGE_LABELS = new Set(['档位', '定时', 'Turbo 倒计时']);

/** 不需要按值着色的卡片标签 */
const NO_COLOR_LABELS = new Set(['定时', '档位', 'Turbo 倒计时']);

/** 统一颜色：按值在 min-max 范围中的百分比分区 */
function getColor(numericValue: number, min: number, max: number, dangerLow?: boolean): string {
  if (Number.isNaN(numericValue)) return 'var(--color-text)';
  const range = max - min || 1;
  const pct = dangerLow ? 1 - ((numericValue - min) / range) : (numericValue - min) / range;
  if (pct >= 0.9) return 'var(--color-danger)';
  if (pct >= 0.7) return 'var(--color-warning)';
  return 'var(--color-text)';
}

export function MetricCard({
  label,
  value,
  unit,
  rawValue,
  decimals,
  accent: _accent,
  gaugeMin = 0,
  gaugeMax = 100,
  noGauge = false,
  style,
  className,
  children,
}: MetricCardProps) {
  const editable = useEditMode();
  const variant: 'number' | 'gauge' = noGauge ? 'number' : NO_GAUGE_LABELS.has(label) ? 'number' : useMetricStore((s) => s.configs[label]?.variant ?? 'number');
  const storeMin = useMetricStore((s) => s.configs[label]?.min);
  const storeMax = useMetricStore((s) => s.configs[label]?.max);
  const setVariant = useMetricStore((s) => s.setVariant);
  const setRange = useMetricStore((s) => s.setRange);

  const numericValue = rawValue ?? (typeof value === 'number' ? value : parseFloat(String(value)));
  const showGauge = variant === 'gauge' && !Number.isNaN(numericValue);

  // 数值显示格式化：decimals 只对纯数字 value 生效（字符串原样展示）
  const displayValue: string =
    decimals !== undefined && typeof value === 'number'
      ? value.toFixed(decimals)
      : String(value);

  // 从字符串 value 中推断单位（如 "3.85 V" → "V"），显式 unit prop 优先
  const effectiveUnit = unit ?? (typeof value === 'string' ? String(value).replace(/^-?[\d.]+/, '').trim() : undefined);

  const min = storeMin ?? GAUGE_PRESETS[label]?.min ?? gaugeMin;
  const max = storeMax ?? GAUGE_PRESETS[label]?.max ?? gaugeMax;
  const dangerLow = GAUGE_PRESETS[label]?.dangerLow ?? false;
  const color = NO_COLOR_LABELS.has(label) ? 'var(--color-text)' : getColor(numericValue, min, max, dangerLow);

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
      {/* label + config buttons */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          marginBottom: '2px',
        }}
      >
        <span
          style={{
            color: 'var(--color-text-muted)',
            fontSize: '10px',
            letterSpacing: '0.05em',
            flex: 1,
            minWidth: 0,
            padding: '2px 0',
          }}
        >
          {label}
        </span>

        {/* edit-mode buttons */}
        {editable && !noGauge && !NO_GAUGE_LABELS.has(label) && (
          <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
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
            {/* TODO: 自定义范围暂时隐藏 */}
            {false && <button
              onClick={(e) => {
                e.stopPropagation();
                openConfig();
              }}
              title="数值范围"
              style={iconBtnStyle}
            >
              ⚙
            </button>}
          </div>
        )}
      </div>

      {/* config popup — 固定定位避免被下方卡片遮挡 */}
      {configOpen && (
        <>
          <div
            onClick={() => setConfigOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 999,
            }}
          />
          <div
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
        <Gauge value={numericValue} min={min} max={max} unit={effectiveUnit} color={color} dangerLow={dangerLow} />
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
              fontSize: `clamp(14px, ${Math.max(18, 42 - displayValue.length * 3)}px, 26px)`,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
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

/** 格式化数字：整数直接显示，小数保留 1 位 */
function fmtNum(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(1);
}

/** 格式化刻度标签：大数缩写为 k，兼容负值 */
function fmtLabel(n: number): string {
  const absN = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (absN >= 10000) return sign + (absN / 1000).toFixed(0) + 'k';
  if (absN >= 1000) {
    const v = absN / 1000;
    const suffix = Number.isInteger(v) ? v + 'k' : v.toFixed(1) + 'k';
    return sign + suffix;
  }
  return fmtNum(n);
}

/** 生成 subArcs 分区着色，dangerLow 时低端为危险区 */
function buildSubArcs(min: number, max: number, dangerLow?: boolean): { limit: number; color: string }[] {
  const range = max - min || 1;
  const isBipolar = min < 0;
  const txt = 'var(--color-text)';
  const warn = 'var(--color-warning)';
  const danger = 'var(--color-danger)';

  if (isBipolar) {
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

interface GaugeProps {
  value: number;
  min: number;
  max: number;
  unit?: string;
  color: string;
  dangerLow?: boolean;
}

function Gauge({ value, min, max, unit, color, dangerLow }: GaugeProps) {
  const valueStr = fmtNum(value);

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px', overflow: 'hidden' }}>
      <div style={{ width: '100%', maxWidth: '140px', flexShrink: 0, minHeight: 0, aspectRatio: '2/1' }}>
        <GaugeComponent
          type="semicircle"
          value={value}
          minValue={min}
          maxValue={max}
          arc={{
            subArcs: buildSubArcs(min, max, dangerLow),
            padding: 0.02,
            width: 0.18,
            cornerRadius: 2,
          }}
          labels={{
            valueLabel: { hide: true },
            tickLabels: {
              type: 'outer',
              defaultTickValueConfig: {
                formatTextValue: (v: string) => fmtLabel(Number(v)),
                style: { fontSize: '8px', fill: 'var(--color-text-dim)', fontFamily: 'var(--font-sans)' },
              },
            },
          }}
          pointer={{
            type: 'needle',
            color,
            elastic: true,
            animationDuration: 500,
            baseColor: 'var(--color-text-dim)',
          }}
          marginInPercent={0.08}
        />
      </div>

      {/* 中心数值 */}
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
