/**
 * 锂电池电压 → 电量百分比估算（查表 + 线性插值）
 *
 * 数据来源：Sony/Murata US18650VTC6 实测 OCV-SOC 曲线
 *   C/20 放电，24h 静置后测量，充/放平均
 *   https://github.com/derlucae98/US18650VTC6_OCV_SOC_Curve
 *
 * 0% 固定 3000 mV（设备 BMS 典型截止电压，高于 VTC6 裸电芯 2.5V 极限）
 * 5%~100% 从实测数据线性插值，5% 步进：
 *
 *    0% → 3.000V   25% → 3.499V   50% → 3.753V   75% → 3.979V
 *    5% → 3.133V   30% → 3.559V   55% → 3.798V   80% → 4.037V
 *   10% → 3.268V   35% → 3.610V   60% → 3.839V   85% → 4.075V
 *   15% → 3.350V   40% → 3.661V   65% → 3.882V   90% → 4.091V
 *   20% → 3.414V   45% → 3.706V   70% → 3.923V   95% → 4.112V
 *  100% → 4.175V
 */
const SOC_TABLE: [number, number][] = [
  [4175, 100],
  [4112,  95],
  [4091,  90],
  [4075,  85],
  [4037,  80],
  [3979,  75],
  [3923,  70],
  [3882,  65],
  [3839,  60],
  [3798,  55],
  [3753,  50],
  [3706,  45],
  [3661,  40],
  [3610,  35],
  [3559,  30],
  [3499,  25],
  [3414,  20],
  [3350,  15],
  [3268,  10],
  [3133,   5],
  [3000,   0],
];

/** 电压 mV → 电量 %，带上下限钳位 */
export function voltageToSoc(voltageMv: number): number {
  if (voltageMv >= SOC_TABLE[0][0]) return SOC_TABLE[0][1];
  if (voltageMv <= SOC_TABLE[SOC_TABLE.length - 1][0]) return SOC_TABLE[SOC_TABLE.length - 1][1];

  for (let i = 0; i < SOC_TABLE.length - 1; i++) {
    const [vHi, sHi] = SOC_TABLE[i];
    const [vLo, sLo] = SOC_TABLE[i + 1];
    if (voltageMv <= vHi && voltageMv >= vLo) {
      const ratio = (voltageMv - vLo) / (vHi - vLo);
      return Math.round(sLo + ratio * (sHi - sLo));
    }
  }
  return 0;
}
