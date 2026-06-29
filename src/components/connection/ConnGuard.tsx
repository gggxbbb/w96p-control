import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useConnectionStore } from '../../stores/connection';
import { useDfuStore } from '../../stores/dfu';

export function ConnGuard({ children }: { children: ReactNode }) {
  const isConnected = useConnectionStore((s) => s.state === 'connected');
  const dfuInProgress = useDfuStore((s) => s.inProgress);

  // 设备已连接，或正在进行 DFU 升级（设备会断开正常连接进入 DFU 模式）
  if (isConnected || dfuInProgress) return <>{children}</>;
  return <Navigate to="/" replace />;
}
