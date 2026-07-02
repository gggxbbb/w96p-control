import { useRegisterSW } from 'virtual:pwa-register/react';
import { useState, useCallback, useEffect } from 'react';

/**
 * PWA 更新提示：检测到新版本时显示 toast，点击刷新激活。
 * 同时提供 `forceCheck` 方法供外部主动检查更新。
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    // 每 5 分钟检查一次（默认 1 小时太慢）
    onRegisteredSW(_swUrl, r) {
      if (r) {
        // 后台周期性检查
        setInterval(() => {
          r.update().catch(() => { /* 静默忽略网络错误 */ });
        }, 5 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.warn('[PWA] SW registration failed:', error);
    },
  });

  const [visible, setVisible] = useState(false);

  // needRefresh 变为 true 时显示 toast
  useEffect(() => {
    if (needRefresh) setVisible(true);
  }, [needRefresh]);

  const handleUpdate = useCallback(() => {
    updateServiceWorker(true); // true = force page reload after update
    setVisible(false);
  }, [updateServiceWorker]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    setNeedRefresh(false);
  }, [setNeedRefresh]);

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      right: 20,
      zIndex: 9999,
      background: 'var(--color-bg-elevated)',
      border: '1px solid var(--color-accent)',
      borderRadius: 10,
      padding: '12px 18px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      fontSize: 13,
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      maxWidth: 360,
    }}>
      <span>🔄 新版本可用</span>
      <button
        onClick={handleUpdate}
        style={{
          background: 'var(--color-accent)',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          padding: '5px 14px',
          cursor: 'pointer',
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        立即更新
      </button>
      <button
        onClick={handleDismiss}
        style={{
          background: 'transparent',
          color: 'var(--color-text-muted)',
          border: 'none',
          cursor: 'pointer',
          fontSize: 16,
          padding: '0 4px',
          lineHeight: 1,
        }}
      >
        ✕
      </button>
    </div>
  );
}

/**
 * 主动检查更新（替代旧的 forceRefresh 核弹方案）。
 * 尝试触发 SW update + 激活，失败则退回页面重载。
 */
export async function checkAndUpdate(): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    window.location.reload();
    return;
  }

  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    if (regs.length === 0) {
      // 没有 SW → 直接刷新
      window.location.reload();
      return;
    }

    const reg = regs[0]!;
    // 如果有 waiting SW，直接激活它
    if (reg.waiting) {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      await new Promise<void>((resolve) => {
        navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true });
        setTimeout(resolve, 5000); // 兜底 5s
      });
      window.location.reload();
      return;
    }

    // 先尝试 update
    await reg.update();
    // 等待一小段时间让新 SW 安装
    await new Promise((r) => setTimeout(r, 1000));

    const updated = await navigator.serviceWorker.getRegistration(reg.scope);
    if (updated?.waiting) {
      updated.waiting.postMessage({ type: 'SKIP_WAITING' });
      await new Promise<void>((resolve) => {
        navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true });
        setTimeout(resolve, 5000);
      });
    }

    window.location.reload();
  } catch {
    // 任何错误都退回简单重载
    window.location.reload();
  }
}
