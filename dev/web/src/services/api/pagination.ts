import type {
    BackendPaginatedResponse,
    FrontendPaginatedResponse,
} from '@/services/api/types';

export function adaptBackendPagination<T>(
    response: BackendPaginatedResponse<T>,
): FrontendPaginatedResponse<T> {
    const safeLimit = response.limit > 0 ? response.limit : 1;

    return {
        data: response.items,
        total: response.total,
        page: response.page,
        pageSize: response.limit,
        totalPages: Math.ceil(response.total / safeLimit),
    };
}
