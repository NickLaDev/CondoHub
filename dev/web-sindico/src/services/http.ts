import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios';
import { createDevMockAdapter } from '@/mocks/mockApi';
import { isDevMockApiEnabled } from '@/mocks';
import { env } from '@/services/env';

declare module 'axios' {
  interface AxiosRequestConfig {
    skipAuthRefresh?: boolean;
    tenantKey?: string | null;
    _retry?: boolean;
  }

  interface InternalAxiosRequestConfig {
    skipAuthRefresh?: boolean;
    tenantKey?: string | null;
    _retry?: boolean;
  }
}

interface HttpAuthBindings {
  getAccessToken: () => string | null;
  getRefreshToken: () => string | null;
  getTenantKey: () => string | null;
  refreshSession: () => Promise<string | null>;
  clearSession: () => void;
}

let authBindings: HttpAuthBindings | null = null;
let refreshPromise: Promise<string | null> | null = null;

function redirectToGlobalLogin() {
  if (typeof window === 'undefined') {
    return;
  }

  if (window.location.pathname !== '/') {
    window.location.replace('/');
  }
}

function resolveTenantKey(config: InternalAxiosRequestConfig) {
  return config.tenantKey ?? authBindings?.getTenantKey() ?? null;
}

export const http = axios.create({
  baseURL: env.apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Local-only mock adapter. Disable it by turning the mock flags off or removing src/mocks and src/dev.
if (isDevMockApiEnabled) {
  http.defaults.adapter = createDevMockAdapter();
}

export function bindHttpAuth(bindings: HttpAuthBindings) {
  authBindings = bindings;
}

http.interceptors.request.use((config) => {
  const accessToken = authBindings?.getAccessToken();

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const originalRequest = error.config as InternalAxiosRequestConfig | undefined;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    if (status !== 401 || originalRequest.skipAuthRefresh || originalRequest._retry) {
      return Promise.reject(error);
    }

    const tenantKey = resolveTenantKey(originalRequest);
    const refreshToken = authBindings?.getRefreshToken();

    if (!authBindings || !refreshToken || !tenantKey) {
      authBindings?.clearSession();
      redirectToGlobalLogin();
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      refreshPromise ??= authBindings.refreshSession().finally(() => {
        refreshPromise = null;
      });

      const nextAccessToken = await refreshPromise;

      if (!nextAccessToken) {
        throw new Error('Não foi possível atualizar a sessão tenant.');
      }

      originalRequest.headers.Authorization = `Bearer ${nextAccessToken}`;

      return http(originalRequest);
    } catch (refreshError) {
      authBindings.clearSession();
      redirectToGlobalLogin();
      return Promise.reject(refreshError);
    }
  },
);
