import type { PropsWithChildren } from 'react';
import { Navigate } from 'react-router-dom';
import { InstitutionalLoader } from '@/components/states/InstitutionalLoader';
import { useTenantBootstrap } from '@/routes/guards/useTenantBootstrap';
import { useAuthStore } from '@/store/auth';

export function PublicTenantRoute({ children }: PropsWithChildren) {
  const { isBootstrapping } = useTenantBootstrap();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const currentInstanceKey = useAuthStore((state) => state.currentInstanceKey);

  if (isBootstrapping) {
    return <InstitutionalLoader />;
  }

  if (isAuthenticated && currentInstanceKey) {
    return <Navigate to={`/${currentInstanceKey}/dashboard`} replace />;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
