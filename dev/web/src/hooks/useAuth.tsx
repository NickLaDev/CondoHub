/* eslint-disable react-refresh/only-export-components */

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { AdminUser, AuthSession } from '@/types';
import {
    AUTH_SESSION_CLEARED_EVENT,
    AUTH_SESSION_UPDATED_EVENT,
    authService,
} from '@/services/auth';

interface AuthContextType {
    session: AuthSession | null;
    user: AdminUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string, remember?: boolean) => Promise<void>;
    logout: () => void;
    error: string | null;
    clearError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<AuthSession | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const user = session?.user ?? null;

    useEffect(() => {
        let cancelled = false;

        async function restoreSession() {
            try {
                const restoredSession = await authService.restoreSession();
                if (!cancelled) {
                    setSession(restoredSession);
                }
            } catch (err) {
                if (!cancelled) {
                    setSession(null);
                    setError(authService.getAuthErrorMessage(err, 'session'));
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        }

        void restoreSession();

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        function handleSessionCleared(event: Event) {
            const customEvent = event as CustomEvent<{ message?: string }>;
            setSession(null);
            setIsLoading(false);
            setError(customEvent.detail?.message ?? null);
        }

        function handleSessionUpdated() {
            setSession(authService.getStoredSession());
        }

        window.addEventListener(AUTH_SESSION_CLEARED_EVENT, handleSessionCleared);
        window.addEventListener(AUTH_SESSION_UPDATED_EVENT, handleSessionUpdated);

        return () => {
            window.removeEventListener(AUTH_SESSION_CLEARED_EVENT, handleSessionCleared);
            window.removeEventListener(AUTH_SESSION_UPDATED_EVENT, handleSessionUpdated);
        };
    }, []);

    const login = useCallback(async (email: string, password: string, remember?: boolean) => {
        setError(null);
        setIsLoading(true);
        try {
            const res = await authService.login({ email, password, rememberSession: remember });
            setSession(res);
        } catch (err) {
            setSession(null);
            setError(authService.getAuthErrorMessage(err, 'login'));
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const logout = useCallback(() => {
        authService.logout();
        setSession(null);
        setError(null);
    }, []);

    const clearError = useCallback(() => setError(null), []);

    return (
        <AuthContext.Provider
            value={{
                session,
                user,
                isAuthenticated: !!session,
                isLoading,
                login,
                logout,
                error,
                clearError,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
