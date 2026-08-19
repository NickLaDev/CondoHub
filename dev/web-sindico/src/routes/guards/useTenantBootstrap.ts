import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';

export function useTenantBootstrap() {
  const { instanceKey = '' } = useParams();
  const bootstrapSession = useAuthStore((state) => state.bootstrapSession);
  const isBootstrapping = useAuthStore((state) => state.isBootstrapping);

  useEffect(() => {
    if (!instanceKey) {
      return;
    }

    void bootstrapSession(instanceKey);
  }, [bootstrapSession, instanceKey]);

  return {
    instanceKey,
    isBootstrapping,
  };
}
