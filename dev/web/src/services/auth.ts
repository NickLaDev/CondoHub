import { apiClient } from '@/services/api';
import { ApiRequestError, type ApiRequestOptions } from '@/services/api/types';
import type { AdminUser, AuthRole, AuthSession, LoginRequest } from '@/types';

const ADMIN_LOGIN_PATH = '/api/v1/admin/auth/login';
const ADMIN_ME_PATH = '/api/v1/admin/auth/me';
const AUTH_REFRESH_PATH = '/api/v1/auth/refresh';

const AUTH_SESSION_STORAGE_KEY = 'condohub_admin_auth_session';
const LEGACY_ADMIN_TOKEN_KEY = 'admin_token';
const LEGACY_ADMIN_USER_KEY = 'admin_user';

export const AUTH_SESSION_CLEARED_EVENT = 'condohub:admin-session-cleared';
export const AUTH_SESSION_UPDATED_EVENT = 'condohub:admin-session-updated';

type AuthErrorContext = 'login' | 'session';
type AuthEventDetail = { message?: string };

interface BackendAuthUser {
    id?: string;
    userId?: string;
    instanceId?: string | null;
    unitId?: string | null;
    roles?: AuthRole[];
    name?: string | null;
    email?: string | null;
    phone?: string | null;
}

interface BackendAuthResponse {
    accessToken: string;
    refreshToken: string;
    expiresInSec: number;
    user: BackendAuthUser;
}

type AdminMeResponse = BackendAuthUser | { user: BackendAuthUser };

let refreshPromise: Promise<AuthSession | null> | null = null;

function canUseLocalStorage() {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function emitAuthEvent(name: string, detail?: AuthEventDetail) {
    if (typeof window === 'undefined') {
        return;
    }

    window.dispatchEvent(new CustomEvent<AuthEventDetail>(name, { detail }));
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === 'object';
}

function readString(value: unknown) {
    return typeof value === 'string' ? value : null;
}

function readRoles(value: unknown, fallback: AuthRole[] = []) {
    if (!Array.isArray(value)) {
        return fallback;
    }

    const roles = value.filter((role): role is AuthRole => typeof role === 'string');
    return roles.length > 0 ? roles : fallback;
}

function extractAdminMeUser(payload: AdminMeResponse) {
    if (isRecord(payload) && isRecord(payload.user)) {
        return payload.user as BackendAuthUser;
    }

    return payload as BackendAuthUser;
}

function assertAdminGlobal(user: Pick<AdminUser, 'roles'>) {
    if (!user.roles.includes('ADMIN_GLOBAL')) {
        throw new Error('Acesso permitido somente para administradores globais.');
    }
}

function mapAdminUser(payload: BackendAuthUser, fallback?: AdminUser | null): AdminUser {
    const payloadId = payload.id ?? payload.userId;
    const fallbackForSameUser = fallback && (!payloadId || payloadId === fallback.id) ? fallback : null;
    const id = payloadId ?? fallbackForSameUser?.id;
    const roles = readRoles(payload.roles, fallbackForSameUser?.roles);
    const instanceId = payload.instanceId !== undefined
        ? payload.instanceId
        : fallbackForSameUser?.instanceId ?? null;
    const unitId = payload.unitId !== undefined ? payload.unitId : fallbackForSameUser?.unitId ?? null;
    const name = payload.name ?? fallbackForSameUser?.name ?? 'Admin Global';
    const email = payload.email ?? fallbackForSameUser?.email ?? '';
    const phone = payload.phone !== undefined ? payload.phone : fallbackForSameUser?.phone ?? null;

    if (!id) {
        throw new Error('Resposta de autenticação inválida.');
    }

    const user: AdminUser = {
        id,
        instanceId,
        unitId,
        roles,
        name,
        email,
        phone,
        role: 'ADMIN_GLOBAL',
        avatarUrl: fallbackForSameUser?.avatarUrl,
    };

    assertAdminGlobal(user);
    return user;
}

function mapAuthSession(payload: BackendAuthResponse, fallbackUser?: AdminUser | null): AuthSession {
    if (
        !payload.accessToken
        || !payload.refreshToken
        || typeof payload.expiresInSec !== 'number'
        || !isRecord(payload.user)
    ) {
        throw new Error('Resposta de autenticação inválida.');
    }

    return {
        accessToken: payload.accessToken,
        refreshToken: payload.refreshToken,
        expiresInSec: payload.expiresInSec,
        user: mapAdminUser(payload.user as BackendAuthUser, fallbackUser),
    };
}

function readStoredSessionValue(value: unknown): AuthSession | null {
    if (!isRecord(value)) {
        return null;
    }

    const userPayload = isRecord(value.user) ? value.user as BackendAuthUser : null;
    const accessToken = readString(value.accessToken);
    const refreshToken = readString(value.refreshToken);
    const expiresInSec = typeof value.expiresInSec === 'number' ? value.expiresInSec : null;

    if (!accessToken || !refreshToken || expiresInSec === null || !userPayload) {
        return null;
    }

    return {
        accessToken,
        refreshToken,
        expiresInSec,
        user: mapAdminUser(userPayload),
    };
}

function clearLegacyStorage() {
    if (!canUseLocalStorage()) {
        return;
    }

    localStorage.removeItem(LEGACY_ADMIN_TOKEN_KEY);
    localStorage.removeItem(LEGACY_ADMIN_USER_KEY);
}

function saveSession(session: AuthSession, notify = true) {
    if (!canUseLocalStorage()) {
        return;
    }

    localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));
    clearLegacyStorage();

    if (notify) {
        emitAuthEvent(AUTH_SESSION_UPDATED_EVENT);
    }
}

function clearSession(message?: string) {
    if (canUseLocalStorage()) {
        localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
        clearLegacyStorage();
    }

    emitAuthEvent(AUTH_SESSION_CLEARED_EVENT, { message });
}

function getStoredSession(): AuthSession | null {
    if (!canUseLocalStorage()) {
        return null;
    }

    const raw = localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
    if (!raw) {
        clearLegacyStorage();
        return null;
    }

    try {
        const session = readStoredSessionValue(JSON.parse(raw));
        if (!session) {
            clearSession();
        }

        return session;
    } catch {
        clearSession();
        return null;
    }
}

function isUnauthorized(error: unknown) {
    return error instanceof ApiRequestError && error.status === 401;
}

export function getAuthErrorMessage(error: unknown, context: AuthErrorContext = 'session') {
    if (error instanceof ApiRequestError) {
        if (error.code === 'NETWORK_ERROR') {
            return error.message;
        }

        if (error.code === 'AUTH_INVALID' || error.code === 'INVALID_CREDENTIALS') {
            return context === 'login'
                ? 'Credenciais inválidas. Verifique email e senha.'
                : 'Sessão expirada. Faça login novamente.';
        }

        if (error.code === 'AUTH_REQUIRED') {
            return 'Sessão expirada. Faça login novamente.';
        }

        if (error.code === 'PERMISSION_DENIED' || error.code === 'FORBIDDEN') {
            return 'Acesso permitido somente para administradores globais.';
        }

        if (error.status === 401) {
            return context === 'login'
                ? 'Credenciais inválidas. Verifique email e senha.'
                : 'Sessão expirada. Faça login novamente.';
        }

        if (error.status === 403) {
            return 'Acesso permitido somente para administradores globais.';
        }

        return error.message;
    }

    if (error instanceof Error) {
        return error.message;
    }

    return context === 'login' ? 'Erro ao fazer login.' : 'Não foi possível validar a sessão.';
}

async function loginAdmin(email: string, password: string) {
    const response = await apiClient.post<BackendAuthResponse>(
        ADMIN_LOGIN_PATH,
        { email, password },
    );
    const session = mapAuthSession(response);
    saveSession(session);
    return session;
}

async function meAdmin(accessToken: string, fallbackUser?: AdminUser | null) {
    const response = await apiClient.get<AdminMeResponse>(ADMIN_ME_PATH, { accessToken });
    return mapAdminUser(extractAdminMeUser(response), fallbackUser);
}

async function refreshAuth(refreshToken: string, fallbackUser?: AdminUser | null) {
    const response = await apiClient.post<BackendAuthResponse>(
        AUTH_REFRESH_PATH,
        { refreshToken },
    );
    return mapAuthSession(response, fallbackUser);
}

async function refreshStoredSession() {
    const currentSession = getStoredSession();
    if (!currentSession) {
        clearSession('Sessão expirada. Faça login novamente.');
        return null;
    }

    refreshPromise ??= refreshAuth(currentSession.refreshToken, currentSession.user)
        .then((session) => {
            saveSession(session);
            return session;
        })
        .catch((error: unknown) => {
            clearSession(getAuthErrorMessage(error, 'session'));
            throw error;
        })
        .finally(() => {
            refreshPromise = null;
        });

    return refreshPromise;
}

async function restoreSession() {
    const storedSession = getStoredSession();
    if (!storedSession) {
        return null;
    }

    try {
        const user = await meAdmin(storedSession.accessToken, storedSession.user);
        const session = { ...storedSession, user };
        saveSession(session);
        return session;
    } catch (error) {
        if (!isUnauthorized(error)) {
            clearSession(getAuthErrorMessage(error, 'session'));
            throw error;
        }
    }

    const refreshedSession = await refreshStoredSession();
    if (!refreshedSession) {
        return null;
    }

    try {
        const user = await meAdmin(refreshedSession.accessToken, refreshedSession.user);
        const session = { ...refreshedSession, user };
        saveSession(session);
        return session;
    } catch (error) {
        clearSession(getAuthErrorMessage(error, 'session'));
        throw error;
    }
}

function shouldSkipAuthRefresh(path: string) {
    return path === ADMIN_LOGIN_PATH || path === ADMIN_ME_PATH || path === AUTH_REFRESH_PATH;
}

async function requestWithAuthRefresh<T>(
    path: string,
    request: (accessToken: string) => Promise<T>,
) {
    const session = getStoredSession();
    if (!session) {
        throw new ApiRequestError({
            status: 401,
            code: 'AUTH_REQUIRED',
            message: 'Sessão expirada. Faça login novamente.',
        });
    }

    try {
        return await request(session.accessToken);
    } catch (error) {
        if (!isUnauthorized(error) || shouldSkipAuthRefresh(path)) {
            throw error;
        }

        const refreshedSession = await refreshStoredSession();
        if (!refreshedSession) {
            throw error;
        }

        return request(refreshedSession.accessToken);
    }
}

export const adminApiClient = {
    get<T>(path: string, options?: ApiRequestOptions) {
        return requestWithAuthRefresh(path, (accessToken) =>
            apiClient.get<T>(path, { ...options, accessToken }));
    },

    post<T>(path: string, body?: unknown, options?: ApiRequestOptions) {
        return requestWithAuthRefresh(path, (accessToken) =>
            apiClient.post<T>(path, body, { ...options, accessToken }));
    },

    patch<T>(path: string, body?: unknown, options?: ApiRequestOptions) {
        return requestWithAuthRefresh(path, (accessToken) =>
            apiClient.patch<T>(path, body, { ...options, accessToken }));
    },
};

export const authService = {
    loginAdmin,
    meAdmin,
    refreshAuth,
    refreshStoredSession,
    restoreSession,
    getStoredSession,
    getAuthErrorMessage,

    async login(req: LoginRequest) {
        return loginAdmin(req.email, req.password);
    },

    logout() {
        clearSession();
    },

    isAuthenticated() {
        return !!getStoredSession();
    },
};
