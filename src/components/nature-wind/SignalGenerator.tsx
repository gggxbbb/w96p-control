import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import type { CSSProperties, PointerEvent } from 'react';
import {
  synthesizeWithEnvelope,
  DEFAULT_LAYER,
  LAYER_OFF,
  DEFAULT_ENVELOPE,
} from '../../lib/curvePresets';
import type { LayerConfig, EnvelopeConfig, WaveformType } from '../../lib/curvePresets';

/* ================================================================
   Props
   ================================================================ */

interface SignalGeneratorProps {
  onSendToEditor: (points: number[]) => void;
  onPointsChange: (points: number[]) => void;
}

/* ================================================================
   Knob component
   ================================================================ */

interface KnobProps {
  value: number;
  min: number;
  max: number;
  step: number;
  label: string;
  unit: string;
  onChange: (v: number) => void;
  size?: number;
}

function Knob({ value, min, max, step, label, unit, onChange, size = 48 }: KnobProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragInfo = useRef<{ startY: number; startVal: number } | null>(null);

  // Map value range to angle: min -> -135°, max -> +135°
  const range = max - min || 1;
  const ratio = (value - min) / range;
  const angle = -135 + ratio * 270;

  // Arc endpoint (tick mark)
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.35;
  const tickR = r - 2;
  const rad = ((angle - 90) * Math.PI) / 180;
  const tx = cx + tickR * Math.cos(rad);
  const ty = cy + tickR * Math.sin(rad);

  // Bg arc (270° sweep, from -135 to +135)
  const bgR = r + 2;

  const handlePointerDown = (e: PointerEvent<SVGSVGElement>) => {
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);
    dragInfo.current = { startY: e.clientY, startVal: value };
  };

  const handlePointerMove = (e: PointerEvent<SVGSVGElement>) => {
    if (!dragInfo.current) return;
    const dy = dragInfo.current.startY - e.clientY;
    const sensitivity = (range / 100) * 2;
    let newVal = dragInfo.current.startVal + dy * sensitivity;
    // Snap to step
    newVal = Math.round(newVal / step) * step;
    newVal = Math.max(min, Math.min(max, newVal));
    if (newVal !== value) onChange(newVal);
  };

  const handlePointerUp = () => {
    dragInfo.current = null;
  };

  // Format display value
  const display = step < 1 ? value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '') : String(value);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1px',
        userSelect: 'none',
      }}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ touchAction: 'none', cursor: 'ns-resize' }}
      >
        {/* Outer ring background */}
        <circle
          cx={cx}
          cy={cy}
          r={r + 4}
          fill="none"
          stroke="var(--color-border-strong)"
          strokeWidth="1"
        />
        {/* Active arc */}
        <path
          d={arcPath(cx, cy, bgR, -135, angle)}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Tick line from center to edge */}
        <line
          x1={cx}
          y1={cy}
          x2={tx}
          y2={ty}
          stroke="var(--color-text)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        {/* Center dot */}
        <circle cx={cx} cy={cy} r="2" fill="var(--color-accent)" />
      </svg>
      {/* Value display */}
      <span
        style={{
          fontSize: '10px',
          color: 'var(--color-text)',
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1,
        }}
      >
        {display}{unit}
      </span>
      {/* Label */}
      <span
        style={{
          fontSize: '9px',
          color: 'var(--color-text-muted)',
          lineHeight: 1,
        }}
      >
        {label}
      </span>
    </div>
  );
}

/* Helpers */
function polar(r: number, deg: number): [number, number] {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [r * Math.cos(rad), r * Math.sin(rad)];
}

function arcPath(cx: number, cy: number, r: number, fromDeg: number, toDeg: number): string {
  const [x1, y1] = polar(r, fromDeg);
  const [x2, y2] = polar(r, toDeg);
  const large = toDeg - fromDeg > 180 ? 1 : 0;
  return `M${cx + x1},${cy + y1} A${r},${r} 0 ${large} 1 ${cx + x2},${cy + y2}`;
}

/* ================================================================
   Constants
   ================================================================ */

const WAVEFORM_LABELS: Record<WaveformType, string> = {
  sine: '正弦',
  triangle: '三角',
  square: '方波',
  sawtooth: '锯齿',
  noise: '噪声',
};

const WAVEFORMS: WaveformType[] = ['sine', 'triangle', 'square', 'sawtooth', 'noise'];

type LayerNumericKey = Exclude<keyof LayerConfig, 'enabled' | 'invert' | 'waveform'>;

interface SliderSpec {
  key: LayerNumericKey;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
}

const LAYER_SLIDERS: SliderSpec[] = [
  { key: 'amplitude', label: '振幅', min: 0, max: 100, step: 1, unit: '' },
  { key: 'frequency', label: '频率', min: 0.5, max: 8, step: 0.5, unit: '' },
  { key: 'offset', label: '偏移', min: -50, max: 50, step: 1, unit: '' },
  { key: 'phase', label: '相位', min: 0, max: 360, step: 1, unit: '°' },
];

type EnvNumericKey = Exclude<keyof EnvelopeConfig, 'enabled'>;

interface EnvSliderSpec {
  key: EnvNumericKey;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
}

const ENV_SLIDERS: EnvSliderSpec[] = [
  { key: 'attack', label: 'Attack', min: 0, max: 64, step: 1, unit: 'pt' },
  { key: 'decay', label: 'Decay', min: 0, max: 64, step: 1, unit: 'pt' },
  { key: 'sustain', label: 'Sustain', min: 0, max: 1, step: 0.05, unit: '' },
  { key: 'release', label: 'Release', min: 0, max: 64, step: 1, unit: 'pt' },
];

/* ================================================================
   Inline styles
   ================================================================ */

const knobRow: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-around',
  gap: '4px',
  marginTop: '4px',
};

const btnS: CSSProperties = {
  background: 'transparent',
  color: 'var(--color-text-muted)',
  border: '0.5px solid var(--color-border-strong)',
  borderRadius: '4px',
  padding: '3px 8px',
  fontSize: '10px',
  fontFamily: 'var(--font-sans)',
  cursor: 'pointer',
};

/* ================================================================
   Sub-components
   ================================================================ */

function WaveformSegBtn({
  value,
  onChange,
}: {
  value: WaveformType;
  onChange: (v: WaveformType) => void;
}) {
  return (
    <div style={{ display: 'flex', marginBottom: '2px' }}>
      {WAVEFORMS.map((w, idx) => {
        const active = value === w;
        return (
          <button
            key={w}
            onClick={() => onChange(w)}
            style={{
              flex: 1,
              background: active ? 'var(--color-accent)' : 'transparent',
              color: active ? 'var(--color-bg-page)' : 'var(--color-text-muted)',
              border: '0.5px solid var(--color-border-strong)',
              padding: '4px 2px',
              fontSize: '10px',
              fontFamily: 'var(--font-sans)',
              cursor: 'pointer',
              borderRadius:
                idx === 0
                  ? '4px 0 0 4px'
                  : idx === WAVEFORMS.length - 1
                    ? '0 4px 4px 0'
                    : '0',
              marginLeft: idx > 0 ? '-0.5px' : '0',
            }}
          >
            {WAVEFORM_LABELS[w]}
          </button>
        );
      })}
    </div>
  );
}

function LayerControl({
  layer,
  index,
  onChange,
}: {
  layer: LayerConfig;
  index: number;
  onChange: (l: LayerConfig) => void;
}) {
  const textColor = layer.enabled ? 'var(--color-text)' : 'var(--color-text-muted)';

  return (
    <div style={{ marginBottom: '8px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          marginBottom: '2px',
        }}
      >
        <span style={{ fontSize: '11px', color: textColor, fontWeight: 500 }}>
          Layer {index + 1}
        </span>
        <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
          {WAVEFORM_LABELS[layer.waveform]} · {layer.frequency}
        </span>
        <div style={{ flex: 1 }} />
        <button
          onClick={(e) => {
            e.stopPropagation();
            onChange({ ...layer, invert: !layer.invert });
          }}
          style={{
            ...btnS,
            color: layer.invert ? 'var(--color-accent)' : 'var(--color-text-muted)',
            borderColor: layer.invert
              ? 'var(--color-accent)'
              : 'var(--color-border-strong)',
          }}
        >
          {layer.invert ? '反' : '正'}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onChange({ ...layer, enabled: !layer.enabled });
          }}
          style={{
            ...btnS,
            color: layer.enabled ? 'var(--color-accent)' : 'var(--color-text-muted)',
            borderColor: layer.enabled
              ? 'var(--color-accent)'
              : 'var(--color-border-strong)',
          }}
        >
          {layer.enabled ? '开' : '关'}
        </button>
      </div>
      <WaveformSegBtn
        value={layer.waveform}
        onChange={(w) => onChange({ ...layer, waveform: w })}
      />
      <div style={knobRow}>
        {LAYER_SLIDERS.map((spec) => (
          <Knob
            key={spec.key}
            label={spec.label}
            value={layer[spec.key] as number}
            min={spec.min}
            max={spec.max}
            step={spec.step}
            unit={spec.unit}
            onChange={(v) => onChange({ ...layer, [spec.key]: v })}
          />
        ))}
      </div>
    </div>
  );
}

function EnvelopePreview({ env }: { env: EnvelopeConfig }) {
  const total = 128;
  const polyline = useMemo(() => {
    const { attack, decay, sustain, release } = env;
    const susStart = attack + decay;
    const relStart = total - release;
    const H = 20;
    const W = 160;

    const pts: [number, number][] = [[0, H]];
    if (attack > 0) pts.push([(attack / total) * W, 0]);
    if (decay > 0) pts.push([(susStart / total) * W, H - sustain * H]);
    if (release > 0) {
      pts.push([(relStart / total) * W, H - sustain * H]);
      pts.push([W, H]);
    } else {
      pts.push([W, H - sustain * H]);
    }
    return pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  }, [env]);

  return (
    <svg width="100%" height="20" viewBox="0 0 160 20" style={{ display: 'block' }}>
      <polyline
        points={polyline}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="1"
        opacity="0.5"
      />
    </svg>
  );
}

function EnvelopeControl({
  env,
  onChange,
}: {
  env: EnvelopeConfig;
  onChange: (e: EnvelopeConfig) => void;
}) {
  return (
    <div style={{ marginBottom: '8px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          marginBottom: '2px',
        }}
      >
        <span style={{ fontSize: '11px', color: 'var(--color-text)', fontWeight: 500 }}>
          包络 · ADSR
        </span>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => onChange({ ...env, enabled: !env.enabled })}
          style={{
            ...btnS,
            color: env.enabled ? 'var(--color-accent)' : 'var(--color-text-muted)',
            borderColor: env.enabled
              ? 'var(--color-accent)'
              : 'var(--color-border-strong)',
          }}
        >
          {env.enabled ? '开' : '关'}
        </button>
      </div>
      <EnvelopePreview env={env} />
      <div style={knobRow}>
        {ENV_SLIDERS.map((spec) => (
          <Knob
            key={spec.key}
            label={spec.label}
            value={env[spec.key]}
            min={spec.min}
            max={spec.max}
            step={spec.step}
            unit={spec.unit}
            onChange={(v) => onChange({ ...env, [spec.key]: v })}
          />
        ))}
      </div>
    </div>
  );
}

function WaveformPreview({ composite }: { composite: number[] }) {
  const W = 300;
  const H = 80;
  const pad = 4;

  const gridPath = useMemo(() => {
    const lines: string[] = [];
    for (let i = 0; i <= 8; i++) {
      const x = (i / 8) * W;
      lines.push(`M${x},${pad} L${x},${H - pad}`);
    }
    for (let j = 0; j <= 4; j++) {
      const y = pad + (j / 4) * (H - pad * 2);
      lines.push(`M${pad},${y} L${W - pad},${y}`);
    }
    return lines.join(' ');
  }, []);

  const polyline = useMemo(() => {
    const range = 100;
    let d = '';
    for (let i = 0; i < 128; i++) {
      const x = pad + (i / 127) * (W - pad * 2);
      const y = pad + (H - pad * 2) * (1 - composite[i] / range);
      d += `${i === 0 ? 'M' : 'L'}${x},${y} `;
    }
    return d;
  }, [composite]);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{
        width: '100%',
        height: 'auto',
        background: 'var(--color-bg-page)',
        borderRadius: '4px',
        display: 'block',
      }}
    >
      <path
        d={gridPath}
        stroke="var(--color-border)"
        strokeWidth="0.5"
        strokeDasharray="2 3"
        fill="none"
      />
      <path d={polyline} fill="none" stroke="var(--color-accent)" strokeWidth="2" />
    </svg>
  );
}

/* ================================================================
   Main component
   ================================================================ */

export function SignalGenerator({
  onSendToEditor,
  onPointsChange,
}: SignalGeneratorProps) {
  const [layers, setLayers] = useState<LayerConfig[]>([
    { ...DEFAULT_LAYER },
    { ...LAYER_OFF },
    { ...LAYER_OFF },
  ]);
  const [envelope, setEnvelope] = useState<EnvelopeConfig>({ ...DEFAULT_ENVELOPE });

  const composite = useMemo(
    () => synthesizeWithEnvelope(128, layers, envelope, 0, 100),
    [layers, envelope],
  );

  // Report composite to parent on every change
  const prevRef = useRef(composite);
  useEffect(() => {
    if (prevRef.current !== composite) {
      prevRef.current = composite;
      onPointsChange(composite);
    }
  }, [composite, onPointsChange]);

  const updateLayer = useCallback(
    (index: number, layer: LayerConfig) => {
      setLayers((prev) => {
        const next = [...prev];
        next[index] = layer;
        return next;
      });
    },
    [],
  );

  const minVal = Math.min(...composite);
  const maxVal = Math.max(...composite);
  const avgVal = composite.reduce((a, b) => a + b, 0) / composite.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <WaveformPreview composite={composite} />

      {layers.map((layer, i) => (
        <LayerControl
          key={i}
          layer={layer}
          index={i}
          onChange={(l) => updateLayer(i, l)}
        />
      ))}

      <EnvelopeControl env={envelope} onChange={setEnvelope} />

      <div
        style={{
          display: 'flex',
          gap: '12px',
          fontSize: '10px',
          color: 'var(--color-text-muted)',
          fontVariantNumeric: 'tabular-nums',
          marginTop: '4px',
        }}
      >
        <span>最小 {minVal}</span>
        <span>最大 {maxVal}</span>
        <span>平均 {avgVal.toFixed(1)}</span>
      </div>

      <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
        <button
          onClick={() => onSendToEditor(composite)}
          style={{
            flex: 1,
            background: 'transparent',
            color: 'var(--color-text-muted)',
            border: '0.5px solid var(--color-border-strong)',
            borderRadius: '4px',
            padding: '6px 10px',
            fontSize: '11px',
            fontFamily: 'var(--font-sans)',
            cursor: 'pointer',
          }}
        >
          发送到编辑器
        </button>
      </div>
    </div>
  );
}
