export const ROLES = {
  ADMIN_GLOBAL: 'ADMIN_GLOBAL',
  SINDICO_ADMIN: 'SINDICO_ADMIN',
  FUNC_ENTREGAS: 'FUNC_ENTREGAS',
  FUNC_MANUTENCAO: 'FUNC_MANUTENCAO',
  MORADOR: 'MORADOR',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ALL_ROLES: Role[] = Object.values(ROLES);
