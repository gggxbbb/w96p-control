import { NavLink } from 'react-router-dom';
import type { ReactNode } from 'react';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
}

const ICONS = {
  dashboard: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" />
      <rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" />
    </svg>
  ),
  fan: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 12L12 4A4 4 0 0 1 16 8L12 12Z" />
      <path d="M12 12L20 12A4 4 0 0 1 16 16L12 12Z" />
      <path d="M12 12L12 20A4 4 0 0 1 8 16L12 12Z" />
      <path d="M12 12L4 12A4 4 0 0 1 8 8L12 12Z" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  ),
  nature: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 8h11a3 3 0 1 0-3-3" /><path d="M3 14h15a3 3 0 1 1-3 3" />
    </svg>
  ),
  power: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="7" width="16" height="10" rx="1" />
      <path d="M7 10v4M10 10v4M13 10v4" /><path d="M21 11v2" />
    </svg>
  ),
  config: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="4" y="4" width="6" height="6" /><rect x="14" y="4" width="6" height="6" />
      <rect x="4" y="14" width="6" height="6" /><rect x="14" y="14" width="6" height="6" />
    </svg>
  ),
  history: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 3v5h5" /><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" />
      <path d="M12 7v5l4 2" />
    </svg>
  ),
  settings: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
    </svg>
  ),
};

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: '总览', icon: ICONS.dashboard },
  { to: '/fan', label: '风扇', icon: ICONS.fan },
  { to: '/nature-wind', label: '自然风', icon: ICONS.nature },
  { to: '/power', label: '电源', icon: ICONS.power },
  { to: '/power-config', label: '寄存器', icon: ICONS.config },
  { to: '/history', label: '历史', icon: ICONS.history },
  { to: '/settings', label: '设置', icon: ICONS.settings },
];

export function SideNav() {
  return (
    <nav
      className="side-nav hidden md:flex"
      style={{
        width: '56px',
        background: 'var(--color-bg-inset)',
        borderRight: '0.5px solid var(--color-border)',
        padding: '12px 0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        flexShrink: 0,
      }}
    >
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          title={item.label}
          style={({ isActive }) => ({
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: isActive ? 'color-mix(in srgb, var(--color-accent) 13%, transparent)' : 'transparent',
            borderLeft: isActive ? '2px solid var(--color-accent)' : '2px solid transparent',
            borderRadius: '4px',
            color: isActive ? 'var(--color-accent)' : 'var(--color-text-muted)',
            textDecoration: 'none',
          })}
        >
          {item.icon}
        </NavLink>
      ))}
    </nav>
  );
}
