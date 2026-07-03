/**
 * 固件版本特性门控
 * 
 * compareVersion("1.3", "1.2") => 1
 * compareVersion("1.10", "1.10") => 0
 */
export function compareVersion(a: string | null, b: string): number {
  if (!a || a === 'unknown') return -1;
  const ap = a.split('.').map(Number);
  const bp = b.split('.').map(Number);
  for (let i = 0; i < Math.max(ap.length, bp.length); i++) {
    const av = ap[i] ?? 0;
    const bv = bp[i] ?? 0;
    if (av > bv) return 1;
    if (av < bv) return -1;
  }
  return 0;
}

/** 所有固件版本默认启用的基础功能 */
export const FEATURE_BASE = new Set([
  'autoBootOnSpeed',
  'autoBootOnTurbo',
]);

/** 每个固件版本的增量变更：+加功能 / -减功能 */
export interface FeatureDelta {
  add?: string[];
  remove?: string[];
}

export const FEATURE_DELTAS: [string, FeatureDelta][] = [
  ['1.3', { add: ['turbo', 'turboTime', 'lightOff', 'bleName'] }],
  ['1.5', {
    add: ['turbo2Byte', 'turboCountdown', 'turboReadable'],
    remove: ['bleName'],
  }],
];

/** 根据固件版本获取启用的功能集合 */
export function getFeatures(version: string | null): Set<string> {
  const enabled = new Set(FEATURE_BASE);
  const sorted = [...FEATURE_DELTAS].sort((a, b) => compareVersion(a[0], b[0]));
  for (const [ver, delta] of sorted) {
    if (compareVersion(version, ver) < 0) break;
    if (delta.add) for (const f of delta.add) enabled.add(f);
    if (delta.remove) for (const f of delta.remove) enabled.delete(f);
  }
  return enabled;
}
