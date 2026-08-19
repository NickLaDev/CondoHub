import { adminApiClient } from '@/services/auth';
import type { GlobalStats } from '@/types';

const ADMIN_STATS_PATH = '/api/v1/admin/stats';

interface BackendAdminStatsResponse {
    instances?: {
        total?: number;
        active?: number;
        suspended?: number;
    };
    plans?: {
        total?: number;
        active?: number;
        archived?: number;
    };
    users?: {
        total?: number;
        adminGlobal?: number;
        tenant?: number;
    };
}

function readCount(value: unknown) {
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function mapAdminStatsToGlobalStats(response: BackendAdminStatsResponse): GlobalStats {
    const activeInstances = readCount(response.instances?.active);
    const suspendedInstances = readCount(response.instances?.suspended);

    return {
        totalInstances: readCount(response.instances?.total),
        activeInstances,
        suspendedInstances,
        totalPlans: readCount(response.plans?.total),
        activePlans: readCount(response.plans?.active),
        archivedPlans: readCount(response.plans?.archived),
        totalUsers: readCount(response.users?.total),
        adminGlobalUsers: readCount(response.users?.adminGlobal),
        tenantUsers: readCount(response.users?.tenant),
        instancesByPlan: [],
        instancesByStatus: [
            { status: 'Ativas', count: activeInstances },
            { status: 'Suspensas', count: suspendedInstances },
        ],
    };
}

export const adminStatsService = {
    async get(): Promise<GlobalStats> {
        const response = await adminApiClient.get<BackendAdminStatsResponse>(ADMIN_STATS_PATH);
        return mapAdminStatsToGlobalStats(response);
    },
};

export const statsService = adminStatsService;
