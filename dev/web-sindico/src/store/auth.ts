import { create } from 'zustand';
import { isDevAuthBypassEnabled } from '@/mocks';
import { createDevTenantSession } from '@/mocks/mockAuth';
import { queryClient } from '@/app/queryClient';
import {
  getTenantMe,
  loginGlobal,
  loginTenant as loginTenantRequest,
  logoutTenant,
  refreshTenantSession,
  selectInstance as selectInstanceRequest,
} from '@/modules/auth/api';
import type {
  GlobalLoginResponse,
  InstanceSelectionOption,
  InstanceSelectionRequiredResponse,
  LoginCredentials,
  TenantSessionResponse,
  TenantUser,
} from '@/modules/auth/types';
import { getErrorCode, getErrorMessage, getHttpStatus } from '@/services/errors';
import { bindHttpAuth } from '@/services/http';

const SESSION_STORAGE_KEY = 'condohub.tenant.session';
const MISSING_INSTANCE_KEY_MESSAGE =
  'O backend não retornou instanceKey para esta sessão. Não foi possível abrir o painel do síndico.';
const EXPIRED_INSTANCE_SELECTION_MESSAGE =
  'A seleção de condomínio expirou. Faça login novamente.';
const INSTANCE_SELECTION_NOT_ALLOWED_MESSAGE =
  'Sua conta não pode selecionar este condomínio.';

interface PendingInstanceSelection {
  selectionToken: string;
  options: InstanceSelectionOption[];
}

interface PersistedTenantSession {
  instanceKey: string;
  accessToken: string;
  refreshToken: string;
  expiresInSec: number;
  user: TenantUser | null;
  persistedAt: number;
}

interface AuthState {
  currentInstanceKey: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  user: TenantUser | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  authError: string | null;
  isSubmitting: boolean;
  pendingInstanceSelection: PendingInstanceSelection | null;
  login: (credentials: LoginCredentials) => Promise<string | null>;
  loginTenant: (instanceKey: string, credentials: LoginCredentials) => Promise<void>;
  selectInstance: (instanceId: string) => Promise<string>;
  logout: () => Promise<void>;
  bootstrapSession: (instanceKey: string) => Promise<TenantUser | null>;
  refreshSession: () => Promise<string | null>;
  clearSession: () => void;
  clearAuthError: () => void;
  clearPendingInstanceSelection: () => void;
}

interface VolatileAuthState {
  currentInstanceKey: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  user: TenantUser | null;
  isAuthenticated: boolean;
  authError: string | null;
  isSubmitting: boolean;
  pendingInstanceSelection: PendingInstanceSelection | null;
}

const EMPTY_AUTH_STATE: VolatileAuthState = {
  currentInstanceKey: null,
  accessToken: null,
  refreshToken: null,
  user: null,
  isAuthenticated: false,
  authError: null,
  isSubmitting: false,
  pendingInstanceSelection: null,
};

let bootstrapPromise: Promise<TenantUser | null> | null = null;
let bootstrapTenantKey: string | null = null;

function canUsePersistedSession() {
  return !isDevAuthBypassEnabled;
}

function readPersistedSession(): PersistedTenantSession | null {
  if (!canUsePersistedSession()) {
    return null;
  }

  if (typeof window === 'undefined') {
    return null;
  }

  const rawValue = window.localStorage.getItem(SESSION_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as PersistedTenantSession;
  } catch {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

function writePersistedSession(session: PersistedTenantSession) {
  if (!canUsePersistedSession()) {
    return;
  }

  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

function clearPersistedSession() {
  if (!canUsePersistedSession()) {
    return;
  }

  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(SESSION_STORAGE_KEY);
}

function toPersistedSession(
  instanceKey: string,
  payload: Pick<
    TenantSessionResponse,
    'accessToken' | 'refreshToken' | 'expiresInSec'
  > & { user: TenantUser | null },
): PersistedTenantSession {
  return {
    instanceKey,
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken,
    expiresInSec: payload.expiresInSec,
    user: payload.user,
    persistedAt: Date.now(),
  };
}

function resetTenantContext(instanceKey: string | null) {
  clearPersistedSession();
  queryClient.clear();
  return {
    ...EMPTY_AUTH_STATE,
    currentInstanceKey: instanceKey,
    isBootstrapping: false,
  };
}

function isInstanceSelectionRequiredResponse(
  payload: GlobalLoginResponse,
): payload is InstanceSelectionRequiredResponse {
  return 'requiresInstanceSelection' in payload
    && payload.requiresInstanceSelection === true;
}

function requireSessionInstanceKey(session: TenantSessionResponse) {
  const instanceKey = session.user?.instanceKey?.trim();

  if (!instanceKey) {
    throw new Error(MISSING_INSTANCE_KEY_MESSAGE);
  }

  return instanceKey;
}

function shouldUseDevInstanceSelection(credentials: LoginCredentials) {
  return credentials.email.trim().toLowerCase().includes('multi');
}

function buildDevPendingInstanceSelection(): PendingInstanceSelection {
  return {
    selectionToken: 'dev-selection-token',
    options: [
      {
        instanceId: 'dev-instance',
        instanceKey: 'dev',
        instanceName: 'CondoHub Dev',
        userId: 'dev-user',
        unitId: null,
        unitLabel: null,
        roles: ['SINDICO_ADMIN'],
      },
      {
        instanceId: 'demo-instance',
        instanceKey: 'demo',
        instanceName: 'CondoHub Demo',
        userId: 'demo-user',
        unitId: null,
        unitLabel: null,
        roles: ['SINDICO_ADMIN'],
      },
    ],
  };
}

function buildDevAuthState(instanceKey: string) {
  const session = createDevTenantSession(instanceKey);

  return {
    currentInstanceKey: instanceKey,
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    user: session.user,
    isAuthenticated: true,
    isBootstrapping: false,
    authError: null,
    isSubmitting: false,
    pendingInstanceSelection: null,
  };
}

function buildPersistedAuthState(session: PersistedTenantSession) {
  return {
    currentInstanceKey: session.instanceKey,
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    user: session.user,
    isAuthenticated: Boolean(session.accessToken && session.refreshToken),
    isBootstrapping: false,
    authError: null,
    isSubmitting: false,
    pendingInstanceSelection: null,
  };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  ...EMPTY_AUTH_STATE,
  isBootstrapping: true,
  async login(credentials) {
    if (isDevAuthBypassEnabled) {
      if (shouldUseDevInstanceSelection(credentials)) {
        clearPersistedSession();
        queryClient.clear();
        set({
          ...EMPTY_AUTH_STATE,
          isBootstrapping: false,
          pendingInstanceSelection: buildDevPendingInstanceSelection(),
        });
        return null;
      }

      const instanceKey = 'condohub';

      if (get().currentInstanceKey && get().currentInstanceKey !== instanceKey) {
        queryClient.clear();
      }

      set(buildDevAuthState(instanceKey));
      return instanceKey;
    }

    set({
      authError: null,
      isSubmitting: true,
      isBootstrapping: false,
      pendingInstanceSelection: null,
    });

    try {
      const response = await loginGlobal(credentials);

      if (isInstanceSelectionRequiredResponse(response)) {
        clearPersistedSession();
        queryClient.clear();
        set({
          ...EMPTY_AUTH_STATE,
          isBootstrapping: false,
          pendingInstanceSelection: {
            selectionToken: response.selectionToken,
            options: response.options,
          },
        });
        return null;
      }

      const instanceKey = requireSessionInstanceKey(response);

      if (get().currentInstanceKey && get().currentInstanceKey !== instanceKey) {
        queryClient.clear();
      }

      const initialPersisted = toPersistedSession(instanceKey, {
        ...response,
        user: response.user ?? null,
      });

      writePersistedSession(initialPersisted);

      set({
        currentInstanceKey: instanceKey,
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        user: response.user ?? null,
        isAuthenticated: true,
        authError: null,
        pendingInstanceSelection: null,
      });

      return instanceKey;
    } catch (error) {
      clearPersistedSession();
      queryClient.clear();
      set({
        ...EMPTY_AUTH_STATE,
        isBootstrapping: false,
        authError: getErrorMessage(error, 'Não foi possível iniciar sessão.'),
      });
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },
  async loginTenant(instanceKey, credentials) {
    if (isDevAuthBypassEnabled) {
      if (get().currentInstanceKey && get().currentInstanceKey !== instanceKey) {
        queryClient.clear();
      }

      set(buildDevAuthState(instanceKey));
      return;
    }

    if (get().currentInstanceKey && get().currentInstanceKey !== instanceKey) {
      set(resetTenantContext(instanceKey));
    }

    set({
      currentInstanceKey: instanceKey,
      authError: null,
      isSubmitting: true,
      isBootstrapping: false,
      pendingInstanceSelection: null,
    });

    try {
      const session = await loginTenantRequest(instanceKey, credentials);

      const initialPersisted = toPersistedSession(instanceKey, {
        ...session,
        user: session.user ?? null,
      });

      writePersistedSession(initialPersisted);

      set({
        currentInstanceKey: instanceKey,
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        user: session.user ?? null,
        isAuthenticated: true,
        pendingInstanceSelection: null,
      });

      const me = await getTenantMe(instanceKey);
      const hydratedPersisted = toPersistedSession(instanceKey, {
        ...session,
        user: me,
      });

      writePersistedSession(hydratedPersisted);

      set({
        user: me,
        isAuthenticated: true,
      });
    } catch (error) {
      clearPersistedSession();
      queryClient.clear();
      set({
        ...EMPTY_AUTH_STATE,
        currentInstanceKey: instanceKey,
        isBootstrapping: false,
        authError: getErrorMessage(error, 'Não foi possível iniciar sessão para esta instância.'),
      });
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },
  async selectInstance(instanceId) {
    const pendingSelection = get().pendingInstanceSelection;

    if (!pendingSelection) {
      const message = 'Faça login novamente para escolher um condomínio.';
      set({
        ...EMPTY_AUTH_STATE,
        isBootstrapping: false,
        authError: message,
      });
      throw new Error(message);
    }

    if (isDevAuthBypassEnabled) {
      const option = pendingSelection.options.find((item) => item.instanceId === instanceId);

      if (!option) {
        const message = INSTANCE_SELECTION_NOT_ALLOWED_MESSAGE;
        set({
          ...EMPTY_AUTH_STATE,
          isBootstrapping: false,
          pendingInstanceSelection: pendingSelection,
          authError: message,
        });
        throw new Error(message);
      }

      if (get().currentInstanceKey && get().currentInstanceKey !== option.instanceKey) {
        queryClient.clear();
      }

      set(buildDevAuthState(option.instanceKey));
      return option.instanceKey;
    }

    clearPersistedSession();
    queryClient.clear();
    set({
      currentInstanceKey: null,
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      authError: null,
      isSubmitting: true,
      isBootstrapping: false,
    });

    try {
      const session = await selectInstanceRequest({
        selectionToken: pendingSelection.selectionToken,
        instanceId,
      });
      const instanceKey = requireSessionInstanceKey(session);

      if (get().currentInstanceKey && get().currentInstanceKey !== instanceKey) {
        queryClient.clear();
      }

      const persisted = toPersistedSession(instanceKey, {
        ...session,
        user: session.user ?? null,
      });

      writePersistedSession(persisted);

      set({
        currentInstanceKey: instanceKey,
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        user: session.user ?? null,
        isAuthenticated: true,
        authError: null,
        pendingInstanceSelection: null,
      });

      return instanceKey;
    } catch (error) {
      clearPersistedSession();
      queryClient.clear();

      const status = getHttpStatus(error);
      const code = getErrorCode(error);

      if (status === 401 || code === 'INVALID_SELECTION_TOKEN') {
        set({
          ...EMPTY_AUTH_STATE,
          isBootstrapping: false,
          authError: EXPIRED_INSTANCE_SELECTION_MESSAGE,
        });
        throw error;
      }

      const fallbackAuthError = status === 403 || code === 'INSTANCE_SELECTION_NOT_ALLOWED'
        ? INSTANCE_SELECTION_NOT_ALLOWED_MESSAGE
        : getErrorMessage(error, 'Não foi possível escolher o condomínio. Tente novamente.');
      const authError = fallbackAuthError === 'Network Error'
        ? 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.'
        : fallbackAuthError;

      set({
        currentInstanceKey: null,
        accessToken: null,
        refreshToken: null,
        user: null,
        isAuthenticated: false,
        isBootstrapping: false,
        authError,
        pendingInstanceSelection: pendingSelection,
      });
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },
  async logout() {
    if (isDevAuthBypassEnabled) {
      queryClient.clear();
      set({
        ...EMPTY_AUTH_STATE,
        currentInstanceKey: null,
        isBootstrapping: false,
      });
      return;
    }

    const { currentInstanceKey } = get();

    try {
      if (currentInstanceKey) {
        await logoutTenant(currentInstanceKey);
      }
    } finally {
      set(resetTenantContext(null));
    }
  },
  async bootstrapSession(instanceKey) {
    if (isDevAuthBypassEnabled) {
      const currentState = get();

      if (currentState.currentInstanceKey && currentState.currentInstanceKey !== instanceKey) {
        return currentState.user;
      }

      const nextState = buildDevAuthState(instanceKey);
      set(nextState);
      return nextState.user;
    }

    if (bootstrapPromise && bootstrapTenantKey === instanceKey) {
      return bootstrapPromise;
    }

    bootstrapTenantKey = instanceKey;
    bootstrapPromise = (async () => {
      const persisted = readPersistedSession();

      if (!persisted) {
        set(resetTenantContext(null));
        return null;
      }

      if (persisted.instanceKey !== instanceKey) {
        set(buildPersistedAuthState(persisted));
        return persisted.user;
      }

      set({
        currentInstanceKey: instanceKey,
        authError: null,
        isBootstrapping: true,
        pendingInstanceSelection: null,
      });

      set({
        currentInstanceKey: instanceKey,
        accessToken: persisted.accessToken,
        refreshToken: persisted.refreshToken,
        user: persisted.user,
        isAuthenticated: Boolean(persisted.accessToken && persisted.refreshToken),
        isBootstrapping: true,
        authError: null,
        pendingInstanceSelection: null,
      });

      try {
        const me = await getTenantMe(instanceKey);
        const activeState = get();

        const nextSession = toPersistedSession(instanceKey, {
          accessToken: activeState.accessToken ?? persisted.accessToken,
          refreshToken: activeState.refreshToken ?? persisted.refreshToken,
          expiresInSec: persisted.expiresInSec,
          user: me,
        });

        writePersistedSession(nextSession);

        set({
          user: me,
          isAuthenticated: true,
          isBootstrapping: false,
          pendingInstanceSelection: null,
        });

        return me;
      } catch {
        set(resetTenantContext(null));
        return null;
      } finally {
        set({ isBootstrapping: false });
      }
    })();

    try {
      return await bootstrapPromise;
    } finally {
      if (bootstrapTenantKey === instanceKey) {
        bootstrapTenantKey = null;
        bootstrapPromise = null;
      }
    }
  },
  async refreshSession() {
    if (isDevAuthBypassEnabled) {
      const instanceKey = get().currentInstanceKey;

      if (!instanceKey) {
        return null;
      }

      const nextState = buildDevAuthState(instanceKey);
      set(nextState);
      return nextState.accessToken;
    }

    const { currentInstanceKey, refreshToken, user } = get();

    if (!currentInstanceKey || !refreshToken) {
      set(resetTenantContext(null));
      return null;
    }

    const session = await refreshTenantSession(refreshToken);
    const sessionInstanceKey = session.user?.instanceKey?.trim();

    if (sessionInstanceKey && sessionInstanceKey !== currentInstanceKey) {
      set(resetTenantContext(null));
      throw new Error('O refresh retornou sessão de outro tenant.');
    }

    if (get().currentInstanceKey !== currentInstanceKey) {
      set(resetTenantContext(null));
      throw new Error('O tenant ativo mudou durante o refresh da sessão.');
    }

    const nextPersisted = toPersistedSession(currentInstanceKey, {
      ...session,
      user: session.user ?? user,
    });

    writePersistedSession(nextPersisted);

    set({
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      user: session.user ?? user,
      isAuthenticated: true,
      authError: null,
      pendingInstanceSelection: null,
    });

    return session.accessToken;
  },
  clearSession() {
    set(resetTenantContext(null));
  },
  clearAuthError() {
    set({ authError: null });
  },
  clearPendingInstanceSelection() {
    clearPersistedSession();
    queryClient.clear();
    set({
      ...EMPTY_AUTH_STATE,
      isBootstrapping: false,
    });
  },
}));

bindHttpAuth({
  getAccessToken: () => useAuthStore.getState().accessToken,
  getRefreshToken: () => useAuthStore.getState().refreshToken,
  getTenantKey: () => useAuthStore.getState().currentInstanceKey,
  refreshSession: () => useAuthStore.getState().refreshSession(),
  clearSession: () => useAuthStore.getState().clearSession(),
});
