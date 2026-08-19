const DEFAULT_API_BASE_URL = 'http://localhost:3000';
const API_V1_SUFFIX = /\/api\/v1\/?$/;

function trimTrailingSlashes(value: string) {
    return value.replace(/\/+$/, '');
}

export function normalizeApiBaseUrl(value: string | undefined) {
    const candidate = value?.trim() || DEFAULT_API_BASE_URL;
    const withoutTrailingSlashes = trimTrailingSlashes(candidate);

    return withoutTrailingSlashes.replace(API_V1_SUFFIX, '');
}

export const apiConfig = {
    baseUrl: normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL),
};

export function buildApiUrl(path: string) {
    if (/^https?:\/\//i.test(path)) {
        return path;
    }

    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${apiConfig.baseUrl}${normalizedPath}`;
}
