import { useEffect, useRef, type ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    else if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      style={{
        border: 'none',
        borderRadius: 20,
        padding: 0,
        background: 'transparent',
        maxWidth: '90vw',
        width: 360,
      }}
    >
      <div style={{
        background: 'var(--color-new-bg-surface)',
        border: '1px solid var(--color-new-border)',
        borderRadius: 20,
        padding: 16,
        color: 'var(--color-new-text)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 500 }}>{title}</h3>
          <button type="button" onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--color-new-text-muted)' }}>×</button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
