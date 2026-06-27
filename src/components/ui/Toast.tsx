import { useEffect } from 'react';
import { useToastStore } from '../../stores/toast';

export function Toast() {
  const msg = useToastStore((s) => s.msg);
  const clear = useToastStore((s) => s.clear);

  useEffect(() => {
    if (!msg) return;
    const id = setTimeout(clear, 3000);
    return () => clearTimeout(id);
  }, [msg, clear]);

  if (!msg) return null;

  return (
    <div
      role="alert"
      style={{
        position: 'fixed',
        bottom: '40px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'var(--color-bg-surface)',
        color: 'var(--color-text)',
        border: '0.5px solid var(--color-border-strong)',
        borderRadius: '8px',
        padding: '10px 16px',
        fontSize: '13px',
        fontFamily: 'var(--font-sans)',
        zIndex: 1000,
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      }}
    >
      {msg}
    </div>
  );
}
