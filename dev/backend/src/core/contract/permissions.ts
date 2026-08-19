export const PERMISSIONS = {
  STRUCTURE_MANAGE: 'structure:manage',
  USERS_MANAGE: 'users:manage',
  INVITES_MANAGE: 'invites:manage',
  COMMUNICATION_MANAGE: 'communication:manage',
  TICKETS_CREATE: 'tickets:create',
  TICKETS_READ_ANY: 'tickets:read:any',
  TICKETS_READ_UNIT: 'tickets:read:unit',
  TICKETS_UPDATE: 'tickets:update',
  DELIVERIES_MANAGE: 'deliveries:manage',
  DELIVERIES_DELIVER: 'deliveries:deliver',
  DELIVERIES_READ_ANY: 'deliveries:read:any',
  DELIVERIES_READ_UNIT: 'deliveries:read:unit',
  LOGS_READ: 'logs:read',
  ADMIN_MANAGE: 'admin:manage',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: Permission[] = Object.values(PERMISSIONS);
