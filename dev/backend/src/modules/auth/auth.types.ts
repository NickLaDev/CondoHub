export type AccessTokenPayload = {
  sub: string;
  iid: string | null;
  uid: string | null;
  roles: string[];
  tv: number;
};

export type AccessTokenClaims = AccessTokenPayload & {
  iat: number;
  exp: number;
};

export type AuthUser = {
  id: string;
  instanceId: string | null;
  instanceKey?: string | null;
  instanceName?: string | null;
  unitId: string | null;
  unitLabel?: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  roles: string[];
  tokenVersion: number;
  status: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type AuthResponseUser = {
  id: string;
  instanceId: string | null;
  instanceKey?: string | null;
  unitId: string | null;
  roles: string[];
  name: string;
  email: string | null;
  phone: string | null;
};

export type AuthSuccessResponse = AuthTokens & {
  expiresInSec: number;
  user: AuthResponseUser;
};

export type InstanceSelectionOption = {
  instanceId: string;
  instanceKey: string;
  instanceName: string;
  userId: string;
  unitId: string | null;
  unitLabel: string | null;
  roles: string[];
};

export type InstanceSelectionRequiredResponse = {
  requiresInstanceSelection: true;
  selectionToken: string;
  options: InstanceSelectionOption[];
};
