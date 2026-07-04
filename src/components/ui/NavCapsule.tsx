import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';

interface NavItem {
  key: string;
  icon: string;
  label: string;
  path: string;
}

const NAV_ITEMS: NavItem[] = [
  { key: 'home', icon: '🌀', label: '风扇', path: '/' },
  { key: 'power', icon: '⚡', label: '电源', path: '/power' },
  { key: 'nature', icon: '🌊', label: '自然风', path: '/nature-wind' },
];

export function NavCapsule() {
  const navigate = useNavigate();
  const location = useLocation();

  const activeIndex = NAV_ITEMS.findIndex((item) => {
    if (item.path === '/') return location.pathname === '/';
    return location.pathname.startsWith(item.path);
  });

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3, type: 'spring', stiffness: 300, damping: 25 }}
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
        display: 'flex',
        gap: 4,
        padding: 4,
        borderRadius: 24,
        background: 'rgba(255,255,255,0.08)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        border: '0.5px solid rgba(255,255,255,0.1)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      }}
    >
      {NAV_ITEMS.map((item, i) => {
        const isActive = i === activeIndex;
        return (
          <motion.button
            key={item.key}
            onClick={() => navigate(item.path)}
            style={{
              position: 'relative',
              width: 52,
              height: 40,
              borderRadius: 20,
              border: 'none',
              background: 'transparent',
              color: isActive
                ? 'var(--color-text)'
                : 'var(--color-text-tertiary)',
              fontSize: 18,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
              fontFamily: 'var(--font-sans)',
            }}
            whileTap={{ scale: 0.9 }}
          >
            <span style={{ fontSize: 18, lineHeight: 1 }}>{item.icon}</span>
            {isActive && (
              <motion.span
                initial={{ opacity: 0, fontSize: 0 }}
                animate={{ opacity: 1, fontSize: 9 }}
                style={{
                  fontWeight: 500,
                  color: 'var(--color-accent)',
                  lineHeight: 1,
                }}
              >
                {item.label}
              </motion.span>
            )}
            {isActive && (
              <motion.div
                layoutId="nav-indicator"
                style={{
                  position: 'absolute',
                  inset: 2,
                  borderRadius: 18,
                  background: 'rgba(255,255,255,0.08)',
                  zIndex: -1,
                }}
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 30,
                }}
              />
            )}
          </motion.button>
        );
      })}
    </motion.div>
  );
}
