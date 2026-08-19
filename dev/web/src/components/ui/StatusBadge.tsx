import { cn, getStatusColor, getStatusLabel, getSeverityColor, getSeverityLabel } from '@/hooks/utils';
import type { InstanceStatus, PlanStatus, LogSeverity } from '@/types';

interface StatusBadgeProps {
    status: InstanceStatus | PlanStatus;
    size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
    return (
        <span className={cn(
            'inline-flex items-center font-semibold rounded-full',
            getStatusColor(status),
            size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
        )}>
            <span className={cn(
                'rounded-full mr-1.5',
                size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2',
                status === 'ACTIVE' ? 'bg-success' : status === 'SUSPENDED' ? 'bg-danger' : 'bg-secondary'
            )} />
            {getStatusLabel(status)}
        </span>
    );
}

interface SeverityBadgeProps {
    severity: LogSeverity;
}

export function SeverityBadge({ severity }: SeverityBadgeProps) {
    return (
        <span className={cn(
            'inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full',
            getSeverityColor(severity)
        )}>
            {getSeverityLabel(severity)}
        </span>
    );
}
