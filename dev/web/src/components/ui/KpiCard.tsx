import type { ReactNode } from 'react';
import { cn } from '@/hooks/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KpiCardProps {
    title: string;
    value: string | number;
    icon: ReactNode;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
    accent?: boolean;
    onClick?: () => void;
}

export function KpiCard({ title, value, icon, trend, trendValue, accent, onClick }: KpiCardProps) {
    return (
        <div
            className={cn(
                'bg-white rounded-xl border border-border p-5 transition-all duration-200',
                onClick && 'cursor-pointer hover:shadow-md hover:border-accent/30',
                accent && 'border-accent/20 bg-gradient-to-br from-white to-blue-50/50'
            )}
            onClick={onClick}
        >
            <div className="flex items-start justify-between mb-3">
                <div className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center',
                    accent ? 'bg-accent/10 text-accent' : 'bg-surface-secondary text-secondary'
                )}>
                    {icon}
                </div>
                {trend && (
                    <div className={cn(
                        'flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
                        trend === 'up' && 'bg-success-light text-success',
                        trend === 'down' && 'bg-danger-light text-danger',
                        trend === 'neutral' && 'bg-surface-tertiary text-secondary'
                    )}>
                        {trend === 'up' && <TrendingUp size={12} />}
                        {trend === 'down' && <TrendingDown size={12} />}
                        {trend === 'neutral' && <Minus size={12} />}
                        {trendValue}
                    </div>
                )}
            </div>
            <p className="text-2xl font-bold text-tertiary">{value}</p>
            <p className="text-sm text-secondary mt-1">{title}</p>
        </div>
    );
}
