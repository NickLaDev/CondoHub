import type {
  TenantSessionResponse,
  TenantUser,
} from '@/modules/auth/types';

const DEV_AUTH_TTL_SECONDS = 60 * 60 * 24;

const devTenantUser: TenantUser = {
  id: 'dev-user',
  instanceId: 'dev-instance',
  instanceKey: 'condohub',
  unitId: null,
  roles: ['SINDICO_ADMIN'],
  permissions: ['logs:read'],
  name: 'Síndico Dev',
  email: 'dev@condohub.local',
  phone: '(00) 00000-0000',
};

// Local-only fake session used by the temporary auth bypass in development.
export function createDevTenantSession(instanceKey = devTenantUser.instanceKey ?? 'condohub'): TenantSessionResponse {
  return {
    accessToken: 'dev-access-token',
    refreshToken: 'dev-refresh-token',
    expiresInSec: DEV_AUTH_TTL_SECONDS,
    user: {
      ...devTenantUser,
      instanceKey,
      roles: [...devTenantUser.roles],
      permissions: [...(devTenantUser.permissions ?? [])],
    },
  };
}
