export type ApiErrorDetails = Record<string, unknown>;

export interface BackendErrorEnvelope {
    error: true;
    code: string;
    message: string;
    details?: ApiErrorDetails;
}

export interface ApiRequestOptions {
    accessToken?: string | null;
    headers?: HeadersInit;
    signal?: AbortSignal;
}

export interface ApiJsonRequestOptions extends ApiRequestOptions {
    body?: unknown;
}

export interface BackendPaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
}

export interface FrontendPaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export interface ApiRequestErrorOptions {
    status: number | null;
    code: string;
    message: string;
    details?: ApiErrorDetails;
}

export class ApiRequestError extends Error {
    status: number | null;
    code: string;
    details: ApiErrorDetails;

    constructor({ status, code, message, details = {} }: ApiRequestErrorOptions) {
        super(message);
        this.name = 'ApiRequestError';
        this.status = status;
        this.code = code;
        this.details = details;
    }
}
