import { http } from '@/services/http';
import type {
  GlobalLoginResponse,
  LoginCredentials,
  SelectInstanceRequest,
  TenantSessionResponse,
  TenantUser,
} from '@/modules/auth/types';

type MeResponse = TenantUser | { user: TenantUser } | TenantSessionResponse;

function extractUser(payload: MeResponse) {
  if ('user' in payload) {
    return payload.user;
  }

  return payload;
}

export async function loginGlobal(credentials: LoginCredentials) {
  const { data } = await http.post<GlobalLoginResponse>(
    '/api/v1/auth/login',
    credentials,
    {
      skipAuthRefresh: true,
    },
  );

  return data;
}

export async function selectInstance(request: SelectInstanceRequest) {
  const { data } = await http.post<TenantSessionResponse>(
    '/api/v1/auth/select-instance',
    request,
    {
      skipAuthRefresh: true,
    },
  );

  return data;
}

export async function loginTenant(
  instanceKey: string,
  credentials: LoginCredentials,
) {
  const { data } = await http.post<TenantSessionResponse>(
    `/api/v1/${instanceKey}/auth/login`,
    credentials,
    {
      skipAuthRefresh: true,
      tenantKey: instanceKey,
    },
  );

  return data;
}

export async function logoutTenant(instanceKey: string) {
  await http.post(
    `/api/v1/${instanceKey}/auth/logout`,
    {},
    {
      skipAuthRefresh: true,
      tenantKey: instanceKey,
    },
  );
}

export async function getTenantMe(instanceKey: string) {
  const { data } = await http.get<MeResponse>(`/api/v1/${instanceKey}/auth/me`, {
    tenantKey: instanceKey,
  });

  return extractUser(data);
}

export async function refreshTenantSession(refreshToken: string) {
  const { data } = await http.post<TenantSessionResponse>(
    '/api/v1/auth/refresh',
    { refreshToken },
    {
      skipAuthRefresh: true,
    },
  );

  return data;
}
