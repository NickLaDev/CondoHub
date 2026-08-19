export { apiClient } from '@/services/api/client';
export { apiConfig, buildApiUrl, normalizeApiBaseUrl } from '@/services/api/config';
export { adaptBackendPagination } from '@/services/api/pagination';
export {
    ApiRequestError,
    type ApiErrorDetails,
    type ApiJsonRequestOptions,
    type ApiRequestOptions,
    type BackendErrorEnvelope,
    type BackendPaginatedResponse,
    type FrontendPaginatedResponse,
} from '@/services/api/types';
