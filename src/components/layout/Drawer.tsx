import { NavLink } from 'react-router-dom';
import { useEffect } from 'react';
import { NAV_ITEMS } from './navItems';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
}

export function Drawer({ open, onClose }: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="导航菜单"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'rgba(0, 0, 0, 0.4)',
        animation: 'w96p-fade-in 0.15s ease',
      }}
      onClick={onClose}
    >
      <nav
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          width: '220px',
          background: 'var(--color-bg-inset)',
          borderRight: '0.5px solid var(--color-border)',
          padding: '16px 0',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          animation: 'w96p-slide-in 0.2s ease',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '0 16px 16px',
            borderBottom: '0.5px solid var(--color-border)',
            marginBottom: '8px',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.5">
            <circle cx="12" cy="12" r="2.5" />
            <path d="M12 9.5V4M12 14.5V20M9.5 12H4M14.5 12H20M10.3 10.3L6.5 6.5M13.7 13.7L17.5 17.5M13.7 10.3L17.5 6.5M10.3 13.7L6.5 17.5" />
          </svg>
          <span style={{ fontWeight: 500, fontSize: '14px', letterSpacing: '0.5px' }}>
            W96P · 控制
          </span>
        </div>

        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={onClose}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 16px',
              background: isActive ? 'color-mix(in srgb, var(--color-accent) 13%, transparent)' : 'transparent',
              borderLeft: isActive ? '2px solid var(--color-accent)' : '2px solid transparent',
              color: isActive ? 'var(--color-accent)' : 'var(--color-text-muted)',
              textDecoration: 'none',
              fontSize: '13px',
              fontFamily: 'var(--font-sans)',
            })}
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
