export type TenantRole =
  | 'SINDICO_ADMIN'
  | 'FUNC_ENTREGAS'
  | 'FUNC_MANUTENCAO'
  | 'MORADOR'
  | string;

export interface TenantUser {
  id: string;
  instanceId: string;
  instanceKey?: string;
  unitId: string | null;
  roles: TenantRole[];
  permissions?: string[];
  name: string;
  email: string | null;
  phone: string | null;
}

export interface TenantSessionResponse {
  accessToken: string;
  refreshToken: string;
  expiresInSec: number;
  user: TenantUser;
}

export interface InstanceSelectionOption {
  instanceId: string;
  instanceKey: string;
  instanceName: string;
  userId?: string;
  unitId?: string | null;
  unitLabel?: string | null;
  roles?: TenantRole[];
}

export interface InstanceSelectionRequiredResponse {
  requiresInstanceSelection: true;
  selectionToken: string;
  options: InstanceSelectionOption[];
}

export type GlobalLoginResponse =
  | TenantSessionResponse
  | InstanceSelectionRequiredResponse;

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SelectInstanceRequest {
  selectionToken: string;
  instanceId: string;
}
