import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from './navItems';

export function SideNav() {
  return (
    <nav
      className="side-nav"
      style={{
        width: '56px',
        background: 'var(--color-new-bg-surface)',
        borderRight: '0.5px solid var(--color-new-border)',
        padding: '12px 0',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        flexShrink: 0,
      }}
    >
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.path === '/'}
          title={item.label}
          style={({ isActive }) => ({
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: isActive ? 'color-mix(in srgb, var(--color-new-accent) 13%, transparent)' : 'transparent',
            borderLeft: isActive ? '2px solid var(--color-new-accent)' : '2px solid transparent',
            borderRadius: '4px',
            color: isActive ? 'var(--color-new-accent)' : 'var(--color-new-text-muted)',
            textDecoration: 'none',
          })}
        >
          {item.icon}
        </NavLink>
      ))}
    </nav>
  );
}
