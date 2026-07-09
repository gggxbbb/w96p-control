import { useLocation, Link } from 'react-router-dom';
import { NAV_ITEMS } from './navItems';

export function BottomNav() {
  const { pathname } = useLocation();

  return (
    <nav className="bottom-nav" style={{
      justifyContent: 'space-around',
      alignItems: 'center',
      height: 64,
      background: 'var(--color-new-bg-surface)',
      borderTop: '1px solid var(--color-new-border)',
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
        return (
          <Link
            key={item.path}
            to={item.path}
            aria-current={active ? 'page' : undefined}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              textDecoration: 'none',
              fontSize: 10,
              color: active ? 'var(--color-new-accent)' : 'var(--color-new-text-muted)',
            }}
          >
            <span aria-hidden="true" style={{ fontSize: 20 }}>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
