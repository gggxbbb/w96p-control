/**
 * 固件版本特性门控
 *
 * 不同固件版本支持不同功能特性，通过版本号比较动态决定 UI 展示。
 *
 * @example
 * compareVersion("1.3", "1.2") // => 1
 * compareVersion("1.10", "1.10") // => 0
 */

/**
 * 语义化版本号比较
 * @returns 1（a > b）、0（相等）、-1（a < b）
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
  /** 新增的功能标识 */
  add?: string[];
  /** 移除的功能标识 */
  remove?: string[];
}

/** 固件版本特性增量表（按版本升序排列） */
export const FEATURE_DELTAS: [string, FeatureDelta][] = [
  ['1.3', { add: ['turbo', 'turboTime', 'lightOff', 'bleName'] }],
  ['1.5', {
    add: ['turbo2Byte', 'turboCountdown', 'turboReadable'],
    remove: ['bleName'],
  }],
  ['1.7', { add: ['bleSn'] }],
];

/**
 * 根据固件版本获取启用的功能集合
 *
 * @param version - 设备固件版本号（可能为 null 或 "unknown"）
 * @param isCompatMode - 兼容模式下默认启用所有功能
 * @returns 功能标识字符串的集合
 */
export function getFeatures(version: string | null, isCompatMode = false): Set<string> {
  // 未获取版本信息时与兼容模式一样，默认启用所有功能
  const unknown = isCompatMode || !version || version === 'unknown';
  if (unknown) {
    const all = new Set(FEATURE_BASE);
    for (const [, delta] of FEATURE_DELTAS) {
      if (delta.add) for (const f of delta.add) all.add(f);
    }
    return all;
  }
  const enabled = new Set(FEATURE_BASE);
  const sorted = [...FEATURE_DELTAS].sort((a, b) => compareVersion(a[0], b[0]));
  for (const [ver, delta] of sorted) {
    if (compareVersion(version, ver) < 0) break;
    if (delta.add) for (const f of delta.add) enabled.add(f);
    if (delta.remove) for (const f of delta.remove) enabled.delete(f);
  }
  return enabled;
}
