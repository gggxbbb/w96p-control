import { useEffect, useState } from 'react';
import { IncompatibleScreen } from './IncompatibleScreen';

type Phase = 'checking' | 'ready' | 'incompatible';

const CHECK_TIMEOUT_MS = 3000;

export function BrowserGate({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<Phase>('checking');

  useEffect(() => {
    let cancelled = false;
    let tid: ReturnType<typeof setTimeout> | undefined;

    // navigator.bluetooth 一定存在（main.tsx 已做同步预检），
    // 仅需异步确认 getAvailability，带硬超时防止挂起
    (async () => {
      try {
        tid = setTimeout(() => { if (!cancelled) setPhase('incompatible'); }, CHECK_TIMEOUT_MS);
        const available = await navigator.bluetooth!.getAvailability();
        clearTimeout(tid);
        if (!cancelled) setPhase(available ? 'ready' : 'incompatible');
      } catch {
        clearTimeout(tid);
        if (!cancelled) setPhase('incompatible');
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(tid);
    };
  }, []);

  if (phase === 'checking') {
    return (
      <div className="gate-loading">
        <span className="gate-spinner" />
        <p>正在检查浏览器兼容性…</p>
      </div>
    );
  }

  if (phase === 'incompatible') {
    return <IncompatibleScreen />;
  }

  return <>{children}</>;
}
