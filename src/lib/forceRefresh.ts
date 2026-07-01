/**
 * 强制刷新：清除所有 Service Worker 缓存并重新加载页面。
 * 用于绕过 SW 本地缓存，确保获取最新版本。
 */
export async function forceRefresh(): Promise<void> {
  // 1. 注销所有 Service Worker 并等待完成
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((reg) => reg.unregister()));
      console.log(`[forceRefresh] 已注销 ${registrations.length} 个 SW`);

      // 等待 SW 完全释放控制权
      if (navigator.serviceWorker.controller) {
        await new Promise<void>((resolve) => {
          navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true });
          // 兜底超时 3s
          setTimeout(resolve, 3000);
        });
      }
    } catch (err) {
      console.warn('[forceRefresh] 注销 SW 失败:', err);
    }
  }

  // 2. 清除所有 Cache Storage
  if ('caches' in window) {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      console.log(`[forceRefresh] 已清除 ${keys.length} 个缓存`);
    } catch (err) {
      console.warn('[forceRefresh] 清除缓存失败:', err);
    }
  }

  // 3. 用导航刷新替代 location.reload()，确保不走已注销的 SW
  //    加时间戳绕过浏览器 HTTP 缓存
  window.location.replace(
    window.location.origin + window.location.pathname + '?v=' + Date.now(),
  );
}

/**
 * 检查当前是否由 Service Worker 控制
 */
export function isControlledBySW(): boolean {
  return !!(navigator.serviceWorker?.controller);
}
