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
