import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useConnectionStore } from '../../stores/connection';

export function ConnGuard({ children }: { children: ReactNode }) {
  const isConnected = useConnectionStore((s) => s.state === 'connected');
  return isConnected ? <>{children}</> : <Navigate to="/" replace />;
}
