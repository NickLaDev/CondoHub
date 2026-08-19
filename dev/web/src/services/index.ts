import type {
    Instance,
    Plan,
    AuditLog,
    OperationalAlert,
    PaginatedResponse,
    CreateInstanceRequest,
    UpdateInstanceRequest,
    CreatePlanRequest,
    UpdatePlanRequest,
    SupportResetRequest,
    FiltersState,
} from '@/types';
import { InstanceStatus, PlanStatus, LogSeverity } from '@/types';
import { adminApiClient } from '@/services/auth';
import { adaptBackendPagination } from '@/services/api';
import type { BackendPaginatedResponse } from '@/services/api';

export { adminStatsService, statsService } from '@/services/adminStats';
export { adminApiClient, authService } from '@/services/auth';

// ============================================================================
// Backend response shapes (/api/v1/admin/*)
// ============================================================================

interface BackendInstance {
    id: string;
    instanceKey: string;
    name: string;
    status: string;
    planId: string | null;
    suspendedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

interface BackendPlan {
    id: string;
    name: string;
    features: Record<string, unknown>;
    limits: Record<string, unknown>;
    priceCents: number | null;
    currency: string | null;
    archivedAt: string | null;
    createdAt: string;
}

interface BackendAuditLog {
    id: string;
    instanceId: string;
    action: string;
    targetType: string;
    targetId: string | null;
    unitId: string | null;
    actorUserId: string | null;
    ip: string | null;
    userAgent: string | null;
    requestId: string | null;
    metadata: Record<string, unknown>;
    createdAt: string;
}

interface ResetSindicoResponse {
    ok: boolean;
    instanceId: string;
    userId: string;
}

// ============================================================================
// Helpers
// ============================================================================

function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== '') {
            search.set(key, String(value));
        }
    }
    const qs = search.toString();
    return qs ? `?${qs}` : '';
}

function slugify(value: string): string {
    const slug = value
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return slug || 'plano';
}

function readStringArray(value: unknown): string[] {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function readString(value: unknown): string | undefined {
    return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function readNumber(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

// ===== Instances =====

const INSTANCES_PATH = '/api/v1/admin/instances';

function mapInstance(raw: BackendInstance, planName?: string): Instance {
    return {
        id: raw.id,
        name: raw.name,
        instanceKey: raw.instanceKey,
        status: (raw.status as InstanceStatus) ?? InstanceStatus.ACTIVE,
        planId: raw.planId ?? '',
        planName: raw.planId ? planName ?? '—' : 'Sem plano',
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
        // address / units / adminName / adminEmail não são persistidos pelo backend.
    };
}

async function fetchPlanNameMap(): Promise<Map<string, string>> {
    const res = await adminApiClient.get<BackendPaginatedResponse<BackendPlan>>(
        `/api/v1/admin/plans${buildQuery({ page: 1, limit: 100 })}`,
    );
    return new Map(res.items.map((plan) => [plan.id, plan.name]));
}

export const instancesService = {
    async list(filters: FiltersState): Promise<PaginatedResponse<Instance>> {
        const path = `${INSTANCES_PATH}${buildQuery({
            page: filters.page,
            limit: filters.pageSize,
            q: filters.search,
            status: filters.status && filters.status !== 'ALL' ? filters.status : undefined,
            planId: filters.plan && filters.plan !== 'ALL' ? filters.plan : undefined,
        })}`;

        const [res, planNames] = await Promise.all([
            adminApiClient.get<BackendPaginatedResponse<BackendInstance>>(path),
            fetchPlanNameMap(),
        ]);

        const adapted = adaptBackendPagination(res);
        return {
            data: adapted.data.map((raw) => mapInstance(raw, planNames.get(raw.planId ?? ''))),
            total: adapted.total,
            page: adapted.page,
            pageSize: adapted.pageSize,
            totalPages: adapted.totalPages,
        };
    },

    async getById(id: string): Promise<Instance> {
        const [raw, planNames] = await Promise.all([
            adminApiClient.get<BackendInstance>(`${INSTANCES_PATH}/${id}`),
            fetchPlanNameMap(),
        ]);
        return mapInstance(raw, planNames.get(raw.planId ?? ''));
    },

    async create(req: CreateInstanceRequest): Promise<Instance> {
        const raw = await adminApiClient.post<BackendInstance>(INSTANCES_PATH, {
            name: req.name,
            instanceKey: req.instanceKey,
            planId: req.planId ? req.planId : null,
        });
        return mapInstance(raw);
    },

    async update(id: string, req: UpdateInstanceRequest): Promise<Instance> {
        const body: Record<string, unknown> = {};
        if (req.name !== undefined) body.name = req.name;
        if (req.planId !== undefined) body.planId = req.planId ? req.planId : null;

        const raw = await adminApiClient.patch<BackendInstance>(`${INSTANCES_PATH}/${id}`, body);
        return mapInstance(raw);
    },

    async suspend(id: string): Promise<Instance> {
        await adminApiClient.post<{ ok: boolean }>(`${INSTANCES_PATH}/${id}/suspend`);
        return this.getById(id);
    },

    async reactivate(id: string): Promise<Instance> {
        await adminApiClient.post<{ ok: boolean }>(`${INSTANCES_PATH}/${id}/reactivate`);
        return this.getById(id);
    },
};

// ===== Plans =====

const PLANS_PATH = '/api/v1/admin/plans';

function mapPlan(raw: BackendPlan): Plan {
    const features = raw.features ?? {};
    const limits = raw.limits ?? {};
    return {
        id: raw.id,
        name: raw.name,
        slug: readString(features.slug) ?? slugify(raw.name),
        price: raw.priceCents != null ? raw.priceCents / 100 : 0,
        status: raw.archivedAt ? PlanStatus.ARCHIVED : PlanStatus.ACTIVE,
        instanceCount: 0, // backend não expõe contagem por plano
        features: readStringArray(features.items),
        description: readString(features.description),
        maxUnits: readNumber(limits.maxUnits),
    };
}

export const plansService = {
    async list(filters: FiltersState): Promise<PaginatedResponse<Plan>> {
        const archived =
            filters.status === 'ARCHIVED' ? true : filters.status === 'ACTIVE' ? false : undefined;

        const path = `${PLANS_PATH}${buildQuery({
            page: filters.page,
            limit: filters.pageSize,
            q: filters.search,
            archived,
        })}`;

        const res = await adminApiClient.get<BackendPaginatedResponse<BackendPlan>>(path);
        const adapted = adaptBackendPagination(res);
        return {
            data: adapted.data.map(mapPlan),
            total: adapted.total,
            page: adapted.page,
            pageSize: adapted.pageSize,
            totalPages: adapted.totalPages,
        };
    },

    async getById(id: string): Promise<Plan> {
        const raw = await adminApiClient.get<BackendPlan>(`${PLANS_PATH}/${id}`);
        return mapPlan(raw);
    },

    async create(req: CreatePlanRequest): Promise<Plan> {
        const raw = await adminApiClient.post<BackendPlan>(PLANS_PATH, {
            name: req.name,
            priceCents: Math.round((req.price || 0) * 100),
            currency: 'BRL',
            features: { items: req.features, description: req.description, slug: req.slug },
            limits: { maxUnits: req.maxUnits },
        });
        return mapPlan(raw);
    },

    async update(id: string, req: UpdatePlanRequest): Promise<Plan> {
        const body: Record<string, unknown> = {
            features: {
                items: req.features ?? [],
                description: req.description,
                slug: slugify(req.name ?? ''),
            },
            limits: { maxUnits: req.maxUnits },
        };
        if (req.name !== undefined) body.name = req.name;
        if (req.price !== undefined) body.priceCents = Math.round(req.price * 100);

        const raw = await adminApiClient.patch<BackendPlan>(`${PLANS_PATH}/${id}`, body);
        return mapPlan(raw);
    },

    async archive(id: string): Promise<Plan> {
        await adminApiClient.post<{ ok: boolean }>(`${PLANS_PATH}/${id}/archive`);
        return this.getById(id);
    },
};

// ===== Logs =====

const LOGS_PATH = '/api/v1/admin/logs';

// Códigos de ação do backend ↔ rótulos conhecidos pela UI (getActionLabel).
const UI_TO_BACKEND_ACTION: Record<string, string> = {
    INSTANCE_CREATED: 'ADMIN_INSTANCE_CREATED',
    INSTANCE_UPDATED: 'ADMIN_INSTANCE_UPDATED',
    INSTANCE_SUSPENDED: 'ADMIN_INSTANCE_SUSPENDED',
    INSTANCE_REACTIVATED: 'ADMIN_INSTANCE_REACTIVATED',
    PLAN_CREATED: 'ADMIN_PLAN_CREATED',
    PLAN_UPDATED: 'ADMIN_PLAN_UPDATED',
    PLAN_ARCHIVED: 'ADMIN_PLAN_ARCHIVED',
    SINDICO_RESET: 'ADMIN_SUPPORT_RESET_SINDICO',
    SINDICO_INVITE_CREATED: 'INVITE_CREATED',
};

const BACKEND_TO_UI_ACTION: Record<string, string> = Object.fromEntries(
    Object.entries(UI_TO_BACKEND_ACTION).map(([ui, backend]) => [backend, ui]),
);

function deriveSeverity(action: string): LogSeverity {
    if (/FAIL/i.test(action)) return LogSeverity.CRITICAL;
    if (/SUSPEND|DISABL|REVOK|ARCHIV|RESET|CANCEL/i.test(action)) return LogSeverity.WARNING;
    return LogSeverity.INFO;
}

function buildLogSummary(raw: BackendAuditLog): string {
    const metaPairs = Object.entries(raw.metadata ?? {})
        .filter(([, value]) => value !== null && value !== undefined && value !== '')
        .slice(0, 2)
        .map(([key, value]) => `${key}: ${String(value)}`);
    if (metaPairs.length > 0) return metaPairs.join(' · ');
    if (raw.targetId) return `${raw.targetType} ${raw.targetId.slice(0, 8)}`;
    return raw.targetType || '—';
}

function mapAuditLog(raw: BackendAuditLog): AuditLog {
    return {
        id: raw.id,
        timestamp: raw.createdAt,
        action: BACKEND_TO_UI_ACTION[raw.action] ?? raw.action,
        actor: raw.actorUserId ?? 'Sistema',
        instanceId: raw.instanceId,
        severity: deriveSeverity(raw.action),
        summary: buildLogSummary(raw),
        details: raw.metadata,
    };
}

export const logsService = {
    async list(filters: FiltersState): Promise<PaginatedResponse<AuditLog>> {
        const action =
            filters.action && filters.action !== 'ALL'
                ? UI_TO_BACKEND_ACTION[filters.action] ?? filters.action
                : undefined;

        const path = `${LOGS_PATH}${buildQuery({
            page: filters.page,
            limit: filters.pageSize,
            q: filters.search,
            action,
            instanceId:
                filters.instanceId && filters.instanceId !== 'ALL' ? filters.instanceId : undefined,
        })}`;

        const res = await adminApiClient.get<BackendPaginatedResponse<BackendAuditLog>>(path);
        const adapted = adaptBackendPagination(res);
        return {
            data: adapted.data.map(mapAuditLog),
            total: adapted.total,
            page: adapted.page,
            pageSize: adapted.pageSize,
            totalPages: adapted.totalPages,
        };
    },
};

// ===== Support =====

export const supportService = {
    async resetSindico(req: SupportResetRequest): Promise<{ success: boolean; message: string }> {
        const res = await adminApiClient.post<ResetSindicoResponse>(
            '/api/v1/admin/support/reset-sindico',
            {
                instanceId: req.instanceId,
                email: req.targetEmail,
                newPassword: req.newPassword,
            },
        );
        return {
            success: res.ok === true,
            message: `Senha do síndico (${req.targetEmail}) redefinida com sucesso.`,
        };
    },
};

// ===== Alerts (derivados de instâncias suspensas) =====

export const alertsService = {
    async list(): Promise<OperationalAlert[]> {
        const suspended = await instancesService.list({
            status: 'SUSPENDED',
            page: 1,
            pageSize: 50,
        });
        return suspended.data.map((inst) => ({
            id: `alert-${inst.id}`,
            type: 'suspended_instance',
            title: `Instância suspensa: ${inst.name}`,
            message: `A instância "${inst.instanceKey}" está suspensa e inacessível aos usuários.`,
            timestamp: inst.updatedAt,
            severity: LogSeverity.WARNING,
        }));
    },
};
