import { ALL_PERMISSIONS, Permission, PERMISSIONS } from './permissions';
import { ALL_ROLES, Role, ROLES } from './roles';

export const rolePermissions: Record<Role, readonly Permission[]> = {
  [ROLES.ADMIN_GLOBAL]: ALL_PERMISSIONS,
  [ROLES.SINDICO_ADMIN]: [
    PERMISSIONS.STRUCTURE_MANAGE,
    PERMISSIONS.USERS_MANAGE,
    PERMISSIONS.INVITES_MANAGE,
    PERMISSIONS.COMMUNICATION_MANAGE,
    PERMISSIONS.TICKETS_CREATE,
    PERMISSIONS.TICKETS_READ_ANY,
    PERMISSIONS.TICKETS_UPDATE,
    PERMISSIONS.DELIVERIES_MANAGE,
    PERMISSIONS.DELIVERIES_READ_ANY,
    PERMISSIONS.LOGS_READ,
  ],
  [ROLES.FUNC_ENTREGAS]: [
    PERMISSIONS.DELIVERIES_MANAGE,
    PERMISSIONS.DELIVERIES_DELIVER,
    PERMISSIONS.DELIVERIES_READ_ANY,
    PERMISSIONS.DELIVERIES_READ_UNIT,
    PERMISSIONS.LOGS_READ,
  ],
  [ROLES.FUNC_MANUTENCAO]: [
    PERMISSIONS.TICKETS_CREATE,
    PERMISSIONS.TICKETS_READ_ANY,
    PERMISSIONS.TICKETS_UPDATE,
    PERMISSIONS.LOGS_READ,
  ],
  [ROLES.MORADOR]: [
    PERMISSIONS.TICKETS_CREATE,
    PERMISSIONS.TICKETS_READ_UNIT,
    PERMISSIONS.DELIVERIES_READ_UNIT,
  ],
};

function isRole(role: string): role is Role {
  return (ALL_ROLES as string[]).includes(role);
}

export function getPermissionsForRoles(roles: readonly string[]): Set<Permission> {
  const permissions = new Set<Permission>();

  for (const role of roles) {
    if (!isRole(role)) {
      continue;
    }

    for (const permission of rolePermissions[role]) {
      permissions.add(permission);
    }
  }

  return permissions;
}

export function hasPermission(roles: readonly string[], permission: Permission): boolean {
  return getPermissionsForRoles(roles).has(permission);
}
