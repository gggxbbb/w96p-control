export const fmtVoltage = (mv: number) => `${(mv / 1000).toFixed(2)} V`;
export const fmtCurrent = (ma: number) =>
  Math.abs(ma) >= 1000 ? `${(ma / 1000).toFixed(2)} A` : `${ma} mA`;
export const fmtPower = (w: number) => `${w.toFixed(2)} W`;
export const fmtTimer = (sec: number) => {
  if (sec <= 0) return '未设置';
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};
export const fmtShutdown = (sec: number) => {
  if (sec === 0) return '永不';
  if (sec < 60) return `${sec}秒`;
  return `${Math.floor(sec / 60)}分`;
};
