import { useLocation, useNavigate } from 'react-router-dom';

export function ModeSwitch() {
  const location = useLocation();
  const navigate = useNavigate();

  const isEasy = location.pathname === '/easy' || location.pathname === '/';
  const target = isEasy ? '/dashboard' : '/easy';

  return (
    <button
      type="button"
      onClick={() => navigate(target)}
      aria-label={isEasy ? '切换到 Pro 模式' : '切换到 Easy 模式'}
        style={{
          display: 'flex',
          alignItems: 'center',
          border: '0.5px solid var(--color-border-strong)',
          borderRadius: '999px',
          padding: '2px',
          background: 'var(--color-bg-page)',
          cursor: 'pointer',
        }}
    >
      <span
        style={{
          borderRadius: '999px',
          padding: '3px 8px',
          fontSize: '10px',
          fontWeight: 500,
          background: isEasy ? 'var(--color-accent)' : 'transparent',
          color: isEasy ? '#fff' : 'var(--color-text-muted)',
          transition: 'background 0.15s, color 0.15s',
        }}
      >
        Easy
      </span>
      <span
        style={{
          borderRadius: '999px',
          padding: '3px 8px',
          fontSize: '10px',
          fontWeight: 500,
          background: !isEasy ? 'var(--color-accent)' : 'transparent',
          color: !isEasy ? '#fff' : 'var(--color-text-muted)',
          transition: 'background 0.15s, color 0.15s',
        }}
      >
        Pro
      </span>
    </button>
  );
}
