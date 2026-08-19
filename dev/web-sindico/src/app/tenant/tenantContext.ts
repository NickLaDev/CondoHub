import { createContext, useContext } from 'react';

export interface TenantContextValue {
  instanceKey: string;
  instanceName: string;
}

export const TenantContext = createContext<TenantContextValue | null>(null);

export function humanizeInstanceKey(instanceKey: string) {
  return instanceKey
    .split(/[-_]/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

export function useTenantContext() {
  const context = useContext(TenantContext);

  if (!context) {
    throw new Error('useTenantContext must be used inside TenantContextProvider.');
  }

  return context;
}
