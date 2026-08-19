import { buildApiUrl } from '@/services/api/config';
import {
    ApiRequestError,
    type ApiJsonRequestOptions,
    type ApiRequestOptions,
    type BackendErrorEnvelope,
} from '@/services/api/types';

const NETWORK_ERROR_MESSAGE =
    'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.';
const UNKNOWN_ERROR_CODE = 'UNKNOWN_ERROR';
const NETWORK_ERROR_CODE = 'NETWORK_ERROR';

function isJsonResponse(response: Response) {
    return response.headers.get('content-type')?.includes('application/json') ?? false;
}

async function parseJsonSafely(response: Response) {
    if (response.status === 204 || !isJsonResponse(response)) {
        return null;
    }

    const text = await response.text();
    if (!text) {
        return null;
    }

    try {
        return JSON.parse(text) as unknown;
    } catch {
        return null;
    }
}

function isBackendErrorEnvelope(payload: unknown): payload is BackendErrorEnvelope {
    if (!payload || typeof payload !== 'object') {
        return false;
    }

    const value = payload as Record<string, unknown>;
    return value.error === true
        && typeof value.code === 'string'
        && typeof value.message === 'string';
}

function createHeaders(options: ApiJsonRequestOptions = {}) {
    const headers = new Headers(options.headers);

    if (!headers.has('Accept')) {
        headers.set('Accept', 'application/json');
    }

    if (options.body !== undefined && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    if (options.accessToken) {
        headers.set('Authorization', `Bearer ${options.accessToken}`);
    }

    return headers;
}

function createErrorFromResponse(response: Response, payload: unknown) {
    if (isBackendErrorEnvelope(payload)) {
        return new ApiRequestError({
            status: response.status,
            code: payload.code,
            message: payload.message,
            details: payload.details,
        });
    }

    return new ApiRequestError({
        status: response.status,
        code: UNKNOWN_ERROR_CODE,
        message: response.statusText || 'Não foi possível completar a requisição.',
    });
}

async function request<T>(
    method: 'GET' | 'POST' | 'PATCH',
    path: string,
    options: ApiJsonRequestOptions = {},
): Promise<T> {
    const headers = createHeaders(options);
    const body = options.body === undefined ? undefined : JSON.stringify(options.body);

    let response: Response;
    try {
        response = await fetch(buildApiUrl(path), {
            method,
            headers,
            body,
            signal: options.signal,
        });
    } catch {
        throw new ApiRequestError({
            status: null,
            code: NETWORK_ERROR_CODE,
            message: NETWORK_ERROR_MESSAGE,
        });
    }

    const payload = await parseJsonSafely(response);

    if (!response.ok) {
        throw createErrorFromResponse(response, payload);
    }

    return payload as T;
}

export const apiClient = {
    get<T>(path: string, options?: ApiRequestOptions) {
        return request<T>('GET', path, options);
    },

    post<T>(path: string, body?: unknown, options: ApiRequestOptions = {}) {
        return request<T>('POST', path, { ...options, body });
    },

    patch<T>(path: string, body?: unknown, options: ApiRequestOptions = {}) {
        return request<T>('PATCH', path, { ...options, body });
    },
};
