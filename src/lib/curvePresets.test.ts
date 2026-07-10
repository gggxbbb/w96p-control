// src/lib/curvePresets.test.ts
import { describe, it, expect } from 'vitest';
import {
  generateWaveSample,
  generateLayer,
  synthesizeLayers,
  applyEnvelope,
  synthesizeWithEnvelope,
  DEFAULT_LAYER,
} from './curvePresets';
import type { LayerConfig, EnvelopeConfig } from './curvePresets';

const L = 128;

describe('generateWaveSample', () => {
  it('sine 0相位起点为0', () => {
    const v = generateWaveSample(0, L, 'sine', 50, 1, 0);
    expect(v).toBeCloseTo(0, 1);
  });

  it('sine 1/4周期到达正振幅峰值', () => {
    const quarter = Math.floor(L / 4);
    const v = generateWaveSample(quarter, L, 'sine', 50, 1, 0);
    expect(v).toBeCloseTo(50, 1);
  });

  it('triangle 0相位起点为振幅峰值', () => {
    const v = generateWaveSample(0, L, 'triangle', 50, 1, 0);
    expect(v).toBeCloseTo(50, 0);
  });

  it('triangle 1/2周期到达负峰值', () => {
    const half = Math.floor(L / 2);
    const v = generateWaveSample(half, L, 'triangle', 50, 1, 0);
    expect(v).toBeCloseTo(-50, 0);
  });

  it('square 正端为 +amplitude', () => {
    const v = generateWaveSample(1, L, 'square', 30, 1, 0);
    expect(v).toBe(30);
  });

  it('square 负端为 -amplitude', () => {
    const half = Math.floor(L / 2);
    const v = generateWaveSample(half + 1, L, 'square', 30, 1, 0);
    expect(v).toBe(-30);
  });

  it('square freq=0 时输出为0 (sin(0)=0, sign(0)=0)', () => {
    const v = generateWaveSample(42, L, 'square', 25, 0, 0);
    expect(v).toBe(0);
  });

  it('sawtooth 从负峰值线性上升', () => {
    const v0 = generateWaveSample(0, L, 'sawtooth', 50, 1, 0);
    expect(v0).toBeCloseTo(-50, 1);
  });

  it('sawtooth 中途接近0', () => {
    const mid = Math.floor(L / 2);
    const v = generateWaveSample(mid, L, 'sawtooth', 50, 1, 0);
    expect(v).toBeCloseTo(0, 0);
  });

  it('amplitude=0 恒为0', () => {
    const v = generateWaveSample(42, L, 'sine', 0, 2, 90);
    expect(v).toBe(0);
  });

  it('phase 360度等价于0度', () => {
    const v0 = generateWaveSample(10, L, 'sine', 50, 1, 0);
    const v360 = generateWaveSample(10, L, 'sine', 50, 1, 360);
    expect(v0).toBeCloseTo(v360, 5);
  });

  it('noise 是确定性的', () => {
    const a = generateWaveSample(5, L, 'noise', 100, 0, 0);
    const b = generateWaveSample(5, L, 'noise', 100, 0, 0);
    expect(a).toBe(b);
  });

  it('noise 输出在 [-amp, +amp] 范围内', () => {
    for (let i = 0; i < L; i++) {
      const v = generateWaveSample(i, L, 'noise', 50, 0, 0);
      expect(v).toBeGreaterThanOrEqual(-50);
      expect(v).toBeLessThanOrEqual(50);
    }
  });

  it('length <= 0 返回0', () => {
    expect(generateWaveSample(0, 0, 'sine', 50, 1, 0)).toBe(0);
    expect(generateWaveSample(0, -1, 'sine', 50, 1, 0)).toBe(0);
  });
});

describe('generateLayer', () => {
  it('生成指定长度的点', () => {
    const pts = generateLayer(128, DEFAULT_LAYER);
    expect(pts).toHaveLength(128);
  });

  it('offset 生效', () => {
    const cfg: LayerConfig = { ...DEFAULT_LAYER, offset: 20, frequency: 0 };
    const pts = generateLayer(128, cfg);
    // freq=0 时 sine 恒为 0，所以每点 = offset
    const avg = pts.reduce((a, b) => a + b, 0) / pts.length;
    expect(avg).toBeCloseTo(20, 0);
  });

  it('offset + amplitude 叠加正确', () => {
    const cfg: LayerConfig = { ...DEFAULT_LAYER, amplitude: 30, offset: 10, frequency: 0 };
    const pts = generateLayer(128, cfg);
    // freq=0 → sine=0 → all = offset=10
    expect(pts[0]).toBeCloseTo(10, 1);
  });
});

describe('synthesizeLayers', () => {
  it('空层返回全0', () => {
    const pts = synthesizeLayers(128, []);
    expect(pts).toHaveLength(128);
    expect(pts.every((v) => v === 0)).toBe(true);
  });

  it('禁用层不参与', () => {
    const off: LayerConfig = { ...DEFAULT_LAYER, enabled: false, amplitude: 50 };
    const pts = synthesizeLayers(128, [off]);
    expect(pts.every((v) => v === 0)).toBe(true);
  });

  it('两层叠加', () => {
    const a: LayerConfig = { ...DEFAULT_LAYER, waveform: 'sine', amplitude: 20, frequency: 1 };
    const b: LayerConfig = { ...DEFAULT_LAYER, waveform: 'sine', amplitude: 10, frequency: 2, offset: 5 };
    const pts = synthesizeLayers(128, [a, b]);
    // 手动算点0 — should equal generateLayer sum
    const layerA = generateLayer(128, a);
    const layerB = generateLayer(128, b);
    for (let i = 0; i < 128; i++) {
      expect(pts[i]).toBeCloseTo(layerA[i] + layerB[i], 5);
    }
  });

  it('三层叠加总和合理', () => {
    const layers: LayerConfig[] = [
      { ...DEFAULT_LAYER, waveform: 'sine', amplitude: 20, frequency: 1 },
      { ...DEFAULT_LAYER, waveform: 'triangle', amplitude: 15, frequency: 2, enabled: true },
      { ...DEFAULT_LAYER, waveform: 'sine', amplitude: 10, frequency: 3, enabled: false },
    ];
    const pts = synthesizeLayers(128, layers);
    // 只有2层启用
    const maxV = Math.max(...pts);
    // 两层振幅峰值和为 20 + 15 = 35，offset 均为 0
    expect(maxV).toBeLessThanOrEqual(40);
    expect(maxV).toBeGreaterThan(0);
  });
});

describe('applyEnvelope', () => {
  it('attack=0, sustain=1, release=0 时不变', () => {
    const env: EnvelopeConfig = { enabled: true, attack: 0, decay: 0, sustain: 1, release: 0 };
    const input = Array.from({ length: 128 }, (_, i) => i % 100);
    const out = applyEnvelope(input, env);
    expect(out).toEqual(input.map((v) => Math.max(0, Math.min(100, v))));
  });

  it('attack阶段最后一点达到1', () => {
    const env: EnvelopeConfig = { enabled: true, attack: 16, decay: 0, sustain: 1, release: 0 };
    const input = new Array(128).fill(100);
    const out = applyEnvelope(input, env);
    expect(out[0]).toBe(0);
    expect(out[15]).toBeCloseTo(100, 1); // attack=16 → last attack idx=15 → coeff=1
  });

  it('sustain=0.5 时平台期减半', () => {
    const env: EnvelopeConfig = { enabled: true, attack: 10, decay: 10, sustain: 0.5, release: 10 };
    const input = new Array(128).fill(100);
    const out = applyEnvelope(input, env);
    // 第60点应在 sustain 区 (attack 0-9, decay 10-19, sustain 20-117)
    const mid = out[60];
    expect(mid).toBeCloseTo(50, 0);
  });

  it('release结束归零', () => {
    const env: EnvelopeConfig = { enabled: true, attack: 0, decay: 0, sustain: 1, release: 16 };
    const input = new Array(128).fill(100);
    const out = applyEnvelope(input, env);
    // last point should be 0
    expect(out[127]).toBe(0);
  });

  it('clamp 上下限生效', () => {
    const env: EnvelopeConfig = { enabled: true, attack: 0, decay: 0, sustain: 1, release: 0 };
    const input = new Array(128).fill(200);
    const out = applyEnvelope(input, env, 10, 90);
    const maxV = Math.max(...out);
    const minV = Math.min(...out);
    expect(maxV).toBeLessThanOrEqual(90);
    expect(minV).toBeGreaterThanOrEqual(10);
  });

  it('空入力返回空出力', () => {
    const env: EnvelopeConfig = { enabled: true, attack: 4, decay: 4, sustain: 0.5, release: 4 };
    const out = applyEnvelope([], env);
    expect(out).toEqual([]);
  });
});

describe('synthesizeWithEnvelope', () => {
  it('envelope disabled 时不应用包络', () => {
    const layers: LayerConfig[] = [DEFAULT_LAYER];
    const env: EnvelopeConfig = { enabled: false, attack: 32, decay: 32, sustain: 0, release: 32 };
    const pts = synthesizeWithEnvelope(128, layers, env);
    // disabled → raw composite should have positive values (sine oscillates)
    expect(pts.some((v) => v > 0)).toBe(true);
  });

  it('包络启用时影响输出', () => {
    const layers: LayerConfig[] = [
      { ...DEFAULT_LAYER, amplitude: 0, frequency: 0, offset: 50 },
    ];
    const env: EnvelopeConfig = { enabled: true, attack: 10, decay: 10, sustain: 0.5, release: 10 };
    const pts = synthesizeWithEnvelope(128, layers, env);
    // mid sustain zone ~25 (50 * 0.5)
    const mid = pts[64];
    expect(mid).toBeCloseTo(25, 0);
  });

  it('clamp 限制合成输出', () => {
    const layers: LayerConfig[] = [
      { ...DEFAULT_LAYER, amplitude: 200, frequency: 1, offset: 100 },
    ];
    const noEnv: EnvelopeConfig = { enabled: false, attack: 0, decay: 0, sustain: 1, release: 0 };
    const pts = synthesizeWithEnvelope(128, layers, noEnv, 20, 80);
    const maxV = Math.max(...pts);
    const minV = Math.min(...pts);
    expect(maxV).toBeLessThanOrEqual(80);
    expect(minV).toBeGreaterThanOrEqual(20);
  });
});
