/**
 * 自然风曲线预设与波形合成
 *
 * 提供内置曲线 PRESETS、波形生成器（正弦/三角/方波/锯齿/噪声）、
 * 包络 ADSR 调制、多层合成等功能。
 *
 * 所有曲线输出 128 点，范围为 0-100，对应风扇转速百分比。
 */

// ── 曲线预设 ──

/** 默认自然风曲线 (128 点，协议文档) */
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

/** 生成正弦曲线 */
function sineCurve(cycles: number, base: number, amp: number): number[] {
  const arr: number[] = [];
  for (let i = 0; i < 128; i++) {
    const v = base + amp * Math.sin((i / 128) * Math.PI * 2 * cycles);
    arr.push(Math.round(Math.max(0, Math.min(100, v))));
  }
  return arr;
}

/** 内置曲线预设 */
export const PRESETS = {
  smooth: { label: '平滑', data: DEFAULT_CURVE },
  quiet: { label: '安静', data: sineCurve(2, 35, 15) },
  strong: { label: '强劲', data: sineCurve(4, 60, 30) },
} as const;

/**
 * 生成随机曲线（布朗运动风格，缓存上一个值做平滑）
 * @param min - 最小值
 * @param max - 最大值
 */
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

// ── 波形合成 ──

/** 波形类型 */
export type WaveformType = 'sine' | 'triangle' | 'square' | 'sawtooth' | 'noise';

/** 单层波形配置 */
export interface LayerConfig {
  /** 是否启用此层 */
  enabled: boolean;
  /** 波形类型 */
  waveform: WaveformType;
  /** 振幅 (0-100) */
  amplitude: number;
  /** 频率（每 128 点中的完整周期数） */
  frequency: number;
  /** 直流偏移 */
  offset: number;
  /** 相位 (°) */
  phase: number;
  /** 是否反相 */
  invert: boolean;
}

/** ADSR 包络配置 */
export interface EnvelopeConfig {
  /** 是否启用包络 */
  enabled: boolean;
  /** Attack 阶段点数 */
  attack: number;
  /** Decay 阶段点数 */
  decay: number;
  /** Sustain 系数 (0-1) */
  sustain: number;
  /** Release 阶段点数 */
  release: number;
}

/**
 * 生成单点波形采样
 * @param i - 采样索引
 * @param length - 总长度
 * @param waveform - 波形类型
 * @param amplitude - 振幅
 * @param frequency - 频率
 * @param phase - 相位
 */
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

/**
 * 根据配置生成单个完整波形层
 * @param length - 曲线长度
 * @param config - 层配置
 */
export function generateLayer(
  length: number,
  config: LayerConfig,
): number[] {
  const { amplitude, frequency, offset, phase, waveform, invert } = config;
  const pts: number[] = [];
  const sign = invert ? -1 : 1;
  for (let i = 0; i < length; i++) {
    const raw = generateWaveSample(i, length, waveform, amplitude, frequency, phase);
    pts.push(raw * sign + offset);
  }
  return pts;
}

/**
 * 多层波形合成（各层叠加）
 * @param length - 曲线长度
 * @param layers - 层配置列表
 */
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

/**
 * 对曲线应用 ADSR 包络
 * @param points - 输入曲线
 * @param env - 包络配置
 * @param clampMin - 输出下限
 * @param clampMax - 输出上限
 */
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

/**
 * 完整合成流程：多层合成 + 可选的 ADSR 包络
 * @param length - 曲线长度
 * @param layers - 层配置列表
 * @param envelope - 包络配置（enabled=false 时跳过）
 * @param clampMin - 输出下限
 * @param clampMax - 输出上限
 */
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

/** 默认层配置（正弦波 2 周期，振幅 30） */
export const DEFAULT_LAYER: LayerConfig = {
  enabled: true,
  waveform: 'sine',
  amplitude: 30,
  frequency: 2,
  offset: 0,
  phase: 0,
  invert: false,
};

/** 关闭的层模板 */
export const LAYER_OFF: LayerConfig = {
  enabled: false,
  waveform: 'sine',
  amplitude: 20,
  frequency: 3,
  offset: 0,
  phase: 0,
  invert: false,
};

/** 默认 ADSR 包络配置（关闭状态） */
export const DEFAULT_ENVELOPE: EnvelopeConfig = {
  enabled: false,
  attack: 8,
  decay: 8,
  sustain: 0.7,
  release: 16,
};
