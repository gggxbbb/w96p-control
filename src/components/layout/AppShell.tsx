import { Outlet } from 'react-router-dom';
import { NavCapsule } from '../ui/NavCapsule';

export function AppShell() {
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
          paddingBottom: 80,
        }}
      >
        <Outlet />
      </div>
      {/* 底部导航胶囊 */}
      <NavCapsule />
    </div>
  );
}
