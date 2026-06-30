import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
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

interface SliderSpec {
  key: keyof LayerConfig;
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

interface EnvSliderSpec {
  key: keyof EnvelopeConfig;
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

const sliderRow: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  fontSize: '10px',
};

const labelS: CSSProperties = {
  minWidth: '36px',
  color: 'var(--color-text-muted)',
};

const rangeS: CSSProperties = {
  flex: 1,
  height: '4px',
  appearance: 'none' as any,
  background: 'var(--color-border-strong)',
  borderRadius: '2px',
  outline: 'none',
  cursor: 'pointer',
};

const valS: CSSProperties = {
  minWidth: '40px',
  textAlign: 'right' as any,
  color: 'var(--color-text-muted)',
  fontVariantNumeric: 'tabular-nums',
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
    <div style={{ display: 'flex', marginBottom: '6px' }}>
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
    <div style={{ marginBottom: '6px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          marginBottom: '4px',
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
      {LAYER_SLIDERS.map((spec) => (
        <div key={spec.key} style={sliderRow}>
          <span style={labelS}>{spec.label}</span>
          <input
            type="range"
            min={spec.min}
            max={spec.max}
            step={spec.step}
            value={layer[spec.key] as number}
            onChange={(e) =>
              onChange({ ...layer, [spec.key]: Number(e.target.value) })
            }
            style={rangeS}
          />
          <span style={valS}>
            {String(layer[spec.key])}
            {spec.unit}
          </span>
        </div>
      ))}
    </div>
  );
}

function EnvelopePreview({ env }: { env: EnvelopeConfig }) {
  const total = 128;
  const polyline = useMemo(() => {
    const { attack, decay, sustain, release } = env;
    const susStart = attack + decay;
    const relStart = total - release;
    const H = 24;
    const W = 120;

    // Build envelope contour in SVG coordinates (Y inverted)
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
    <svg width="120" height="24" viewBox="0 0 120 24" style={{ alignSelf: 'flex-end' }}>
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
          marginBottom: '4px',
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
      {ENV_SLIDERS.map((spec) => (
        <div key={spec.key} style={sliderRow}>
          <span style={labelS}>{spec.label}</span>
          <input
            type="range"
            min={spec.min}
            max={spec.max}
            step={spec.step}
            value={env[spec.key]}
            onChange={(e) =>
              onChange({ ...env, [spec.key]: Number(e.target.value) })
            }
            style={rangeS}
          />
          <span style={valS}>
            {String(env[spec.key])}
            {spec.unit}
          </span>
        </div>
      ))}
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
