import { Outlet } from 'react-router-dom';
import { NavCapsule } from '../ui/NavCapsule';
import { useMediaQuery } from '../../hooks/useMediaQuery';

export function AppShell() {
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--color-bg)',
        overflow: 'hidden',
      }}
    >
      {/* 动态氛围光晕 */}
      <div className="aura-layer" />
      {/* 内容区 */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          zIndex: 1,
          overflow: 'hidden',
          paddingBottom: isDesktop ? 0 : 80,
        }}
      >
        <Outlet />
      </div>
      {/* 底部导航胶囊（仅移动端/平板） */}
      {!isDesktop && <NavCapsule />}
    </div>
  );
}
