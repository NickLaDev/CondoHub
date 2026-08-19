import { useMemo, type PropsWithChildren } from 'react';
import {
  TenantContext,
  type TenantContextValue,
  humanizeInstanceKey,
} from '@/app/tenant/tenantContext';

interface TenantContextProviderProps extends PropsWithChildren {
  instanceKey: string;
}

export function TenantContextProvider({
  children,
  instanceKey,
}: TenantContextProviderProps) {
  const value = useMemo<TenantContextValue>(
    () => ({
      instanceKey,
      instanceName: humanizeInstanceKey(instanceKey) || 'Condomínio',
    }),
    [instanceKey],
  );

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}
