// 默认曲线（协议文档）
export const DEFAULT_CURVE: number[] = [
  55, 48, 40, 33, 28, 22, 21, 26, 33, 41, 48, 54, 58, 60, 61, 58,
  52, 45, 37, 30, 24, 20, 25, 33, 40, 48, 53, 57, 60, 60, 56, 51,
  43, 36, 29, 23, 21, 28, 37, 47, 56, 63, 68, 71, 72, 71, 67, 62,
  54, 46, 36, 29, 23, 20, 27, 37, 48, 57, 64, 69, 73, 74, 76, 78,
  80, 82, 84, 86, 88, 90, 89, 87, 83, 77, 70, 62, 53, 43, 34, 27,
  21, 20, 26, 32, 38, 43, 47, 49, 50, 48, 44, 38, 33, 27, 24, 20,
  21, 26, 31, 37, 42, 46, 48, 47, 42, 36, 31, 27, 23, 20, 22, 27,
  33, 39, 44, 47, 48, 46, 41, 36, 30, 26, 23, 20, 22, 27, 33, 38,
];

// 生成正弦曲线
function sineCurve(cycles: number, base: number, amp: number): number[] {
  const arr: number[] = [];
  for (let i = 0; i < 128; i++) {
    const v = base + amp * Math.sin((i / 128) * Math.PI * 2 * cycles);
    arr.push(Math.round(Math.max(0, Math.min(100, v))));
  }
  return arr;
}

export const PRESETS = {
  smooth: { label: '平滑', data: DEFAULT_CURVE },
  quiet: { label: '安静', data: sineCurve(2, 35, 15) },
  strong: { label: '强劲', data: sineCurve(4, 60, 30) },
} as const;

export const randomCurve = (min: number, max: number): number[] => {
  const range = max - min;
  const arr: number[] = [];
  let prev = min + range * 0.5;
  for (let i = 0; i < 128; i++) {
    prev += (Math.random() - 0.5) * range * 0.3;
    prev = Math.max(min, Math.min(max, prev));
    arr.push(Math.round(prev));
  }
  return arr;
};

// ============================================================
// 信号发生器 — 波形合成 & 包络
// ============================================================

export type WaveformType = 'sine' | 'triangle' | 'square' | 'sawtooth' | 'noise';

export interface LayerConfig {
  enabled: boolean;
  waveform: WaveformType;
  amplitude: number;
  frequency: number;
  offset: number;
  phase: number;
}

export interface EnvelopeConfig {
  enabled: boolean;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

export function generateWaveSample(
  i: number,
  length: number,
  waveform: WaveformType,
  amplitude: number,
  frequency: number,
  phase: number,
): number {
  if (length <= 0) return 0;
  if (amplitude === 0) return 0;
  const phaseRad = (phase / 360) * Math.PI * 2;

  switch (waveform) {
    case 'sine':
      return amplitude * Math.sin(2 * Math.PI * frequency * i / length + phaseRad);

    case 'triangle': {
      const tp = ((i * frequency / length) + (phase / 360)) % 1;
      return amplitude * (2 * Math.abs(2 * tp - 1) - 1);
    }

    case 'square':
      return amplitude * Math.sign(Math.sin(2 * Math.PI * frequency * i / length + phaseRad));

    case 'sawtooth': {
      const sp = ((i * frequency / length) + (phase / 360)) % 1;
      return amplitude * (2 * sp - 1);
    }

    case 'noise': {
      const hash = (i * 2654435761) >>> 0;
      return amplitude * ((hash % 20001) / 10000 - 1);
    }

    default:
      return 0;
  }
}

export function generateLayer(
  length: number,
  config: LayerConfig,
): number[] {
  const { amplitude, frequency, offset, phase, waveform } = config;
  const pts: number[] = [];
  for (let i = 0; i < length; i++) {
    const raw = generateWaveSample(i, length, waveform, amplitude, frequency, phase);
    pts.push(raw + offset);
  }
  return pts;
}

export function synthesizeLayers(
  length: number,
  layers: LayerConfig[],
): number[] {
  const points = new Array(length).fill(0);
  for (const layer of layers) {
    if (!layer.enabled) continue;
    const layerPts = generateLayer(length, layer);
    for (let i = 0; i < length; i++) {
      points[i] += layerPts[i];
    }
  }
  return points;
}

export function applyEnvelope(
  points: number[],
  env: EnvelopeConfig,
  clampMin = 0,
  clampMax = 100,
): number[] {
  const total = points.length;
  const { attack, decay, sustain, release } = env;
  const sustainStart = attack + decay;
  const releaseStart = total - release;

  return points.map((v, i) => {
    let coeff: number;
    if (i < attack) {
      coeff = attack > 1 ? i / (attack - 1) : 1;
    } else if (i < sustainStart) {
      coeff = decay > 1 ? 1 - (1 - sustain) * ((i - attack) / (decay - 1)) : sustain;
    } else if (i < releaseStart) {
      coeff = sustain;
    } else {
      coeff = release > 1 ? sustain * (1 - (i - releaseStart) / (release - 1)) : 0;
    }
    return Math.max(clampMin, Math.min(clampMax, v * coeff));
  });
}

export function synthesizeWithEnvelope(
  length: number,
  layers: LayerConfig[],
  envelope: EnvelopeConfig,
  clampMin = 0,
  clampMax = 100,
): number[] {
  const composite = synthesizeLayers(length, layers);
  if (envelope.enabled) {
    return applyEnvelope(composite, envelope, clampMin, clampMax);
  }
  return composite.map((v) => Math.max(clampMin, Math.min(clampMax, v)));
}

export const DEFAULT_LAYER: LayerConfig = {
  enabled: true,
  waveform: 'sine',
  amplitude: 30,
  frequency: 2,
  offset: 0,
  phase: 0,
};

export const LAYER_OFF: LayerConfig = {
  enabled: false,
  waveform: 'sine',
  amplitude: 20,
  frequency: 3,
  offset: 0,
  phase: 0,
};

export const DEFAULT_ENVELOPE: EnvelopeConfig = {
  enabled: false,
  attack: 8,
  decay: 8,
  sustain: 0.7,
  release: 16,
};
