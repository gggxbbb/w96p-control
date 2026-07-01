export const fmtTimer = (sec: number) => {
  if (sec <= 0) return '未设置';
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
};
export const fmtShutdown = (sec: number) => {
  if (sec === 0) return '永不';
  if (sec < 60) return `${sec}秒`;
  return `${Math.floor(sec / 60)}分`;
};
