import type { PropsWithChildren } from 'react';
import { Navigate } from 'react-router-dom';
import { InstitutionalLoader } from '@/components/states/InstitutionalLoader';
import { useTenantBootstrap } from '@/routes/guards/useTenantBootstrap';
import { useAuthStore } from '@/store/auth';

export function RequireTenantAuth({ children }: PropsWithChildren) {
  const { instanceKey, isBootstrapping } = useTenantBootstrap();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const currentInstanceKey = useAuthStore((state) => state.currentInstanceKey);

  if (isBootstrapping) {
    return <InstitutionalLoader />;
  }

  if (!isAuthenticated || !currentInstanceKey) {
    return <Navigate to="/" replace />;
  }

  if (currentInstanceKey !== instanceKey) {
    return <Navigate to={`/${currentInstanceKey}/dashboard`} replace />;
  }

  return <>{children}</>;
}
