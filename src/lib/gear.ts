export function inferGear(
  speed: number,
  calib: number[],
  natureWindOn: boolean
): 0 | 1 | 2 | 3 | 4 {
  if (speed === 0 || natureWindOn) return 0;
  let best: 0 | 1 | 2 | 3 | 4 = 0;
  let minDiff = Infinity;
  calib.forEach((sp, i) => {
    const diff = Math.abs(sp - speed);
    if (diff < minDiff) {
      minDiff = diff;
      best = (i + 1) as 1 | 2 | 3 | 4;
    }
  });
  return best;
}
