import { NavLink } from 'react-router-dom';

const ITEMS = [
  { to: '/', label: '总览', icon: 'M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z' },
  { to: '/fan', label: '风扇', icon: 'M12 12L12 4A4 4 0 0 1 16 8L12 12ZM12 12L20 12A4 4 0 0 1 16 16L12 12ZM12 12L12 20A4 4 0 0 1 8 16L12 12ZM12 12L4 12A4 4 0 0 1 8 8L12 12Z' },
  { to: '/nature-wind', label: '自然风', icon: 'M3 8h11a3 3 0 1 0-3-3M3 14h15a3 3 0 1 1-3 3' },
  { to: '/power', label: '电源', icon: 'M3 7h16v10H3zM7 10v4M10 10v4M13 10v4M21 11v2' },
  { to: '/settings', label: '设置', icon: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1' },
];

export function BottomNav() {
  return (
    <nav
      className="bottom-nav md:hidden"
      style={{
        height: '52px',
        background: 'var(--color-bg-inset)',
        borderTop: '0.5px solid var(--color-border)',
        display: 'flex',
        flexShrink: 0,
      }}
    >
      {ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          style={({ isActive }) => ({
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '2px',
            color: isActive ? 'var(--color-accent)' : 'var(--color-text-muted)',
            textDecoration: 'none',
            fontSize: '10px',
          })}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d={item.icon} />
          </svg>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
