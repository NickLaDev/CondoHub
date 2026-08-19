import type { PropsWithChildren, ReactNode } from 'react';
import { ErrorState } from '@/components/states/ErrorState';
import type { TenantRole } from '@/modules/auth/types';
import { useAuthStore } from '@/store/auth';

interface PermissionGuardProps extends PropsWithChildren {
  allow?: TenantRole[];
  allowPermissions?: string[];
  match?: 'any' | 'all';
  hideOnDeny?: boolean;
  fallback?: ReactNode;
}

export function PermissionGuard({
  allow,
  allowPermissions,
  match = 'any',
  children,
  hideOnDeny = false,
  fallback,
}: PermissionGuardProps) {
  const user = useAuthStore((state) => state.user);
  const roles = user?.roles ?? [];
  const permissions = user?.permissions ?? [];

  const hasRoleAccess = !allow?.length
    ? false
    : match === 'all'
      ? allow.every((role) => roles.includes(role))
      : allow.some((role) => roles.includes(role));

  const hasPermissionAccess = !allowPermissions?.length
    ? false
    : match === 'all'
      ? allowPermissions.every((permission) => permissions.includes(permission))
      : allowPermissions.some((permission) => permissions.includes(permission));

  const hasConstraints = Boolean(allow?.length || allowPermissions?.length);
  const hasAccess = !hasConstraints
    || (
      match === 'all' && allow?.length && allowPermissions?.length
        ? hasRoleAccess && hasPermissionAccess
        : hasRoleAccess || hasPermissionAccess
    );

  if (hasAccess) {
    return <>{children}</>;
  }

  if (hideOnDeny) {
    return null;
  }

  return (
    <>
      {fallback ?? (
        <ErrorState
          title="Acesso negado"
          description="Seu perfil não possui permissão para acessar esta área do condomínio."
          code="403"
        />
      )}
    </>
  );
}
