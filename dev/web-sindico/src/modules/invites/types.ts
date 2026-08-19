export type InviteType = 'MORADOR' | 'SINDICO_ADMIN' | 'FUNC_ENTREGAS' | 'FUNC_MANUTENCAO';

export type InviteStatus = 'PENDING' | 'USED' | 'EXPIRED' | 'REVOKED';

export interface Invite {
  id: string;
  type: InviteType;
  email: string;
  unitId?: string;
  unit?: {
    id: string;
    number: string;
    block: {
      id: string;
      name: string;
    };
  };
  status: InviteStatus;
  expiresAt: string;
  usedAt?: string;
  revokedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInviteRequest {
  type: InviteType;
  email: string;
  unitId?: string;
  expiresInDays?: number;
}

export interface InvitesResponse {
  data: Invite[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface InviteCode {
  inviteId: string;
  code: string;
  qrValue: string;
  expiresAt: string;
  expiresInSec: number;
}

export interface ActiveInviteCode {
  inviteId: string;
  codeLast4: string;
  expiresAt: string;
}

export interface ResolveInviteCodeRequest {
  code: string;
}

export interface ResolveInviteCodeResponse {
  ok: true;
  inviteId: string;
  unitId: string;
  signupToken: string;
  expiresAt: string;
}