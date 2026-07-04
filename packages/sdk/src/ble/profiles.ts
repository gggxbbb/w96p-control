/**
 * 设备型号检测与默认值
 *
 * 硬件通过 FFD3 字节长度区分：
 *   >= 5 字节 → 完整模式（W96P，有电机电压）
 *   == 2 字节 → 兼容模式（W66D，无电机电压）
 */

/** 风扇转速范围 */
export const SPEED_RANGE = { min: 0, max: 100 } as const;

/** 完整模式默认档位风速 (W96P) */
export const DEFAULT_SPEEDS_FULL: readonly [number, number, number, number] = [10, 35, 70, 100];

/** 兼容模式默认档位风速 (W66D) */
export const DEFAULT_SPEEDS_COMPAT: readonly [number, number, number, number] = [30, 50, 70, 100];

/**
 * 通过 FFD3（电机信息）字节长度判断是否为兼容模式
 *
 * W66D 只返回 2 字节（电流），W96P 返回 5+ 字节（电流+堵转+电压）。
 *
 * @param ffd3ByteLength - FFD3 特征值字节长度
 */
export function isCompatModel(ffd3ByteLength: number): boolean {
  return ffd3ByteLength < 5;
}

/**
 * 根据设备模式返回对应默认档位风速
 * @param isCompat - 是否兼容模式
 */
export function defaultSpeeds(isCompat: boolean): readonly [number, number, number, number] {
  return isCompat ? DEFAULT_SPEEDS_COMPAT : DEFAULT_SPEEDS_FULL;
}
