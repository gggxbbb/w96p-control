// src/lib/time.ts

/** 格式化 Unix 毫秒时间戳为 GMT+8 中文本地化字符串 */
export function gmt8Now(ts?: number): string {
  const d = new Date(ts ?? Date.now());
  return d.toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}
