// ===== CONSTANTS =====
export const InstanceStatus = {
    ACTIVE: 'ACTIVE',
    SUSPENDED: 'SUSPENDED',
} as const;

export type InstanceStatus =
    (typeof InstanceStatus)[keyof typeof InstanceStatus];

export const PlanStatus = {
    ACTIVE: 'ACTIVE',
    ARCHIVED: 'ARCHIVED',
} as const;

export type PlanStatus =
    (typeof PlanStatus)[keyof typeof PlanStatus];

export const LogSeverity = {
    INFO: 'INFO',
    WARNING: 'WARNING',
    CRITICAL: 'CRITICAL',
} as const;

export type LogSeverity =
    (typeof LogSeverity)[keyof typeof LogSeverity];

export const SupportActionType = {
    RESET_PASSWORD: 'RESET_PASSWORD',
    CREATE_INVITE: 'CREATE_INVITE',
} as const;

export type SupportActionType =
    (typeof SupportActionType)[keyof typeof SupportActionType];

// ===== ENTITIES =====
export type AuthRole =
    | 'ADMIN_GLOBAL'
    | 'SINDICO_ADMIN'
    | 'FUNC_ENTREGAS'
    | 'FUNC_MANUTENCAO'
    | 'MORADOR'
    | (string & {});

export interface AuthUser {
    id: string;
    instanceId: string | null;
    unitId?: string | null;
    roles: AuthRole[];
    name: string;
    email: string;
    phone?: string | null;
}

export interface AdminUser extends AuthUser {
    role: 'ADMIN_GLOBAL';
    avatarUrl?: string;
}

export interface Instance {
    id: string;
    name: string;
    instanceKey: string;
    status: InstanceStatus;
    planId: string;
    planName: string;
    createdAt: string;
    updatedAt: string;
    address?: string;
    units?: number;
    adminName?: string;
    adminEmail?: string;
}

export interface Plan {
    id: string;
    name: string;
    slug: string;
    price: number;
    status: PlanStatus;
    instanceCount: number;
    features: string[];
    description?: string;
    maxUnits?: number;
}

export interface AuditLog {
    id: string;
    timestamp: string;
    action: string;
    actor: string;
    actorEmail?: string;
    instanceId?: string;
    instanceName?: string;
    severity: LogSeverity;
    summary: string;
    details?: Record<string, unknown>;
}

export interface GlobalStats {
    totalInstances: number;
    activeInstances: number;
    suspendedInstances: number;
    totalPlans: number;
    activePlans: number;
    archivedPlans: number;
    totalUsers: number;
    adminGlobalUsers: number;
    tenantUsers: number;
    instancesByPlan: { plan: string; count: number }[];
    instancesByStatus: { status: string; count: number }[];
}

export interface OperationalAlert {
    id: string;
    type: 'suspended_instance' | 'critical_action' | 'admin_warning';
    title: string;
    message: string;
    timestamp: string;
    severity: LogSeverity;
}

// ===== API TYPES =====
export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export interface LoginRequest {
    email: string;
    password: string;
    rememberSession?: boolean;
}

export interface LoginResponse {
    accessToken: string;
    refreshToken: string;
    expiresInSec: number;
    user: AdminUser;
}

export type AuthSession = LoginResponse;

export interface CreateInstanceRequest {
    name: string;
    instanceKey: string;
    planId: string;
    address?: string;
    units?: number;
    adminName?: string;
    adminEmail?: string;
}

export interface UpdateInstanceRequest {
    name?: string;
    planId?: string;
    address?: string;
    units?: number;
}

export interface CreatePlanRequest {
    name: string;
    slug: string;
    price: number;
    features: string[];
    description?: string;
    maxUnits?: number;
}

export interface UpdatePlanRequest {
    name?: string;
    price?: number;
    features?: string[];
    description?: string;
    maxUnits?: number;
}

export interface SupportResetRequest {
    instanceId: string;
    targetEmail: string;
    actionType: SupportActionType;
    reason: string;
    newPassword: string;
}

export interface FiltersState {
    search?: string;
    status?: string;
    plan?: string;
    period?: string;
    action?: string;
    actor?: string;
    instanceId?: string;
    page: number;
    pageSize: number;
}
