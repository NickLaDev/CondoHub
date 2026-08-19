import { InstanceStatus, PlanStatus, LogSeverity } from '@/types';

export function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

export function formatDateTime(dateStr: string): string {
    return new Date(dateStr).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function formatCurrency(value: number): string {
    return value.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    });
}

export function getStatusColor(status: InstanceStatus | PlanStatus): string {
    switch (status) {
        case InstanceStatus.ACTIVE:
        case PlanStatus.ACTIVE:
            return 'bg-success-light text-success';
        case InstanceStatus.SUSPENDED:
            return 'bg-danger-light text-danger';
        case PlanStatus.ARCHIVED:
            return 'bg-surface-tertiary text-secondary';
        default:
            return 'bg-surface-tertiary text-secondary';
    }
}

export function getStatusLabel(status: InstanceStatus | PlanStatus): string {
    const labels: Record<string, string> = {
        ACTIVE: 'Ativo',
        SUSPENDED: 'Suspenso',
        ARCHIVED: 'Arquivado',
    };
    return labels[status] || status;
}

export function getSeverityColor(severity: LogSeverity): string {
    switch (severity) {
        case LogSeverity.INFO:
            return 'bg-blue-50 text-accent';
        case LogSeverity.WARNING:
            return 'bg-warning-light text-warning';
        case LogSeverity.CRITICAL:
            return 'bg-danger-light text-danger';
        default:
            return 'bg-surface-tertiary text-secondary';
    }
}

export function getSeverityLabel(severity: LogSeverity): string {
    const labels: Record<string, string> = {
        INFO: 'Info',
        WARNING: 'Alerta',
        CRITICAL: 'Crítico',
    };
    return labels[severity] || severity;
}

export function getActionLabel(action: string): string {
    const labels: Record<string, string> = {
        INSTANCE_CREATED: 'Instância criada',
        INSTANCE_UPDATED: 'Instância atualizada',
        INSTANCE_SUSPENDED: 'Instância suspensa',
        INSTANCE_REACTIVATED: 'Instância reativada',
        PLAN_CREATED: 'Plano criado',
        PLAN_UPDATED: 'Plano atualizado',
        PLAN_ARCHIVED: 'Plano arquivado',
        SINDICO_RESET: 'Reset de síndico',
        SINDICO_INVITE_CREATED: 'Convite criado',
        ADMIN_LOGIN: 'Login admin',
    };
    return labels[action] || action;
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
    return classes.filter(Boolean).join(' ');
}
