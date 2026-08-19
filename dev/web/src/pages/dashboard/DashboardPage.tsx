import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { KpiCard } from '@/components/ui/KpiCard';
import { SectionCard } from '@/components/ui/PageHeader';
import { SeverityBadge } from '@/components/ui/StatusBadge';
import { Building2, CheckCircle, AlertTriangle, CreditCard, Plus, RotateCcw, ArrowRight } from 'lucide-react';
import { authService, statsService, logsService, alertsService } from '@/services';
import type { GlobalStats, AuditLog, OperationalAlert } from '@/types';
import { LogSeverity } from '@/types';
import { formatDateTime, getActionLabel } from '@/hooks/utils';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

const PIE_COLORS = ['#10B981', '#EF4444'];
const BAR_COLORS = ['#0F2A56', '#2F5DFF', '#8A9099'];

function formatPercent(value: number, total: number) {
    if (total <= 0) {
        return '0%';
    }

    return `${Math.round((value / total) * 100)}%`;
}

export function DashboardPage() {
    const navigate = useNavigate();
    const [stats, setStats] = useState<GlobalStats | null>(null);
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [alerts, setAlerts] = useState<OperationalAlert[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function loadDashboard() {
            setLoading(true);
            setError(null);

            try {
                const [s, l, a] = await Promise.all([
                    statsService.get(),
                    logsService.list({ page: 1, pageSize: 5 }),
                    alertsService.list(),
                ]);

                if (!cancelled) {
                    setStats(s);
                    setLogs(l.data);
                    setAlerts(a);
                }
            } catch (err) {
                if (!cancelled) {
                    setStats(null);
                    setError(authService.getAuthErrorMessage(err, 'session'));
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        void loadDashboard();

        return () => {
            cancelled = true;
        };
    }, []);

    if (loading) {
        return (
            <AppShell title="Dashboard" subtitle="Visão geral da plataforma">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="bg-white rounded-xl border border-border p-5">
                            <div className="skeleton h-10 w-10 rounded-lg mb-3" />
                            <div className="skeleton h-7 w-20 mb-2" />
                            <div className="skeleton h-4 w-28" />
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                    <div className="bg-white rounded-xl border border-border p-5 h-64"><div className="skeleton h-full w-full" /></div>
                    <div className="bg-white rounded-xl border border-border p-5 h-64"><div className="skeleton h-full w-full" /></div>
                </div>
            </AppShell>
        );
    }

    if (error) {
        return (
            <AppShell title="Dashboard" subtitle="Visão geral da plataforma">
                <SectionCard title="Não foi possível carregar o dashboard">
                    <div className="py-10 text-center">
                        <p className="text-sm text-secondary">{error}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="mt-4 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-accent transition-colors"
                        >
                            Tentar novamente
                        </button>
                    </div>
                </SectionCard>
            </AppShell>
        );
    }

    if (!stats) {
        return (
            <AppShell title="Dashboard" subtitle="Visão geral da plataforma">
                <SectionCard title="Dashboard sem dados">
                    <div className="py-10 text-center">
                        <p className="text-sm text-secondary">Nenhum indicador disponível no momento.</p>
                    </div>
                </SectionCard>
            </AppShell>
        );
    }

    const statusChartData = stats.instancesByStatus.filter((item) => item.count > 0);
    const hasStatusData = statusChartData.length > 0;
    const hasPlanData = stats.instancesByPlan.length > 0;
    const activeShare = formatPercent(stats.activeInstances, stats.totalInstances);
    const suspendedShare = formatPercent(stats.suspendedInstances, stats.totalInstances);

    return (
        <AppShell title="Dashboard" subtitle="Visão geral da plataforma">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <KpiCard
                    title="Total de instâncias"
                    value={stats.totalInstances}
                    icon={<Building2 size={20} />}
                    accent
                    onClick={() => navigate('/admin/instances')}
                />
                <KpiCard
                    title="Instâncias ativas"
                    value={stats.activeInstances}
                    icon={<CheckCircle size={20} />}
                    trend="neutral" trendValue={activeShare}
                />
                <KpiCard
                    title="Instâncias suspensas"
                    value={stats.suspendedInstances}
                    icon={<AlertTriangle size={20} />}
                    trend="neutral" trendValue={suspendedShare}
                />
                <KpiCard
                    title="Total de planos"
                    value={stats.totalPlans}
                    icon={<CreditCard size={20} />}
                    trend="neutral" trendValue={`${stats.activePlans} ativos`}
                    onClick={() => navigate('/admin/plans')}
                />
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                <SectionCard title="Distribuição por status">
                    <div className="h-56 flex items-center justify-center">
                        {hasStatusData ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={statusChartData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={55}
                                        outerRadius={85}
                                        paddingAngle={4}
                                        dataKey="count"
                                        nameKey="status"
                                    >
                                        {statusChartData.map((_, i) => (
                                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '12px' }}
                                        formatter={(value, name) => [`${value ?? 0} instâncias`, String(name ?? '')]}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <p className="text-sm text-secondary">Sem dados por status disponíveis.</p>
                        )}
                    </div>
                    {hasStatusData && (
                        <div className="flex items-center justify-center gap-6 mt-2">
                            {statusChartData.map((item, i) => (
                                <div key={item.status} className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ background: PIE_COLORS[i] }} />
                                    <span className="text-xs text-secondary">{item.status}: <span className="font-semibold text-tertiary">{item.count}</span></span>
                                </div>
                            ))}
                        </div>
                    )}
                </SectionCard>

                <SectionCard title="Instâncias por plano">
                    <div className="h-56">
                        {hasPlanData ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.instancesByPlan} barCategoryGap="30%">
                                    <XAxis dataKey="plan" tick={{ fontSize: 11, fill: '#8A9099' }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 11, fill: '#8A9099' }} axisLine={false} tickLine={false} allowDecimals={false} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '12px' }}
                                        formatter={(value) => [`${value ?? 0} instâncias`, 'Quantidade']}
                                    />
                                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                                        {stats.instancesByPlan.map((_, i) => (
                                            <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center">
                                <p className="text-sm text-secondary">Sem dados por plano disponíveis.</p>
                            </div>
                        )}
                    </div>
                </SectionCard>
            </div>

            {/* Bottom row: Quick Actions + Alerts + Recent Logs */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Quick Actions */}
                <SectionCard title="Ações rápidas">
                    <div className="space-y-2">
                        <button
                            onClick={() => navigate('/admin/instances')}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-border hover:border-accent/30 hover:bg-blue-50/30 transition-all group"
                        >
                            <div className="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center group-hover:bg-accent group-hover:text-white transition-all">
                                <Plus size={16} />
                            </div>
                            <div className="text-left">
                                <p className="text-sm font-medium text-tertiary">Criar instância</p>
                                <p className="text-[11px] text-secondary">Adicionar novo condomínio</p>
                            </div>
                            <ArrowRight size={14} className="ml-auto text-secondary/40 group-hover:text-accent transition-colors" />
                        </button>
                        <button
                            onClick={() => navigate('/admin/plans')}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-border hover:border-accent/30 hover:bg-blue-50/30 transition-all group"
                        >
                            <div className="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center group-hover:bg-accent group-hover:text-white transition-all">
                                <CreditCard size={16} />
                            </div>
                            <div className="text-left">
                                <p className="text-sm font-medium text-tertiary">Criar plano</p>
                                <p className="text-[11px] text-secondary">Novo plano de assinatura</p>
                            </div>
                            <ArrowRight size={14} className="ml-auto text-secondary/40 group-hover:text-accent transition-colors" />
                        </button>
                        <button
                            onClick={() => navigate('/admin/support')}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-border hover:border-accent/30 hover:bg-blue-50/30 transition-all group"
                        >
                            <div className="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center group-hover:bg-accent group-hover:text-white transition-all">
                                <RotateCcw size={16} />
                            </div>
                            <div className="text-left">
                                <p className="text-sm font-medium text-tertiary">Resetar síndico</p>
                                <p className="text-[11px] text-secondary">Suporte operacional</p>
                            </div>
                            <ArrowRight size={14} className="ml-auto text-secondary/40 group-hover:text-accent transition-colors" />
                        </button>
                    </div>
                </SectionCard>

                {/* Operational Alerts */}
                <SectionCard title="Alertas operacionais" headerActions={
                    <span className="text-[10px] font-semibold text-danger bg-danger-light px-2 py-0.5 rounded-full">{alerts.length}</span>
                }>
                    <div className="space-y-3">
                        {alerts.slice(0, 4).map((alert) => (
                            <div key={alert.id} className="flex items-start gap-3 pb-3 border-b border-border-light last:border-0 last:pb-0">
                                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${alert.severity === LogSeverity.CRITICAL ? 'bg-danger' :
                                        alert.severity === LogSeverity.WARNING ? 'bg-warning' : 'bg-accent'
                                    }`} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-tertiary">{alert.title}</p>
                                    <p className="text-[11px] text-secondary mt-0.5 line-clamp-2">{alert.message}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </SectionCard>

                {/* Recent Logs */}
                <SectionCard
                    title="Logs recentes"
                    headerActions={
                        <button
                            onClick={() => navigate('/admin/logs')}
                            className="text-xs text-accent hover:text-accent-dark font-medium transition-colors"
                        >
                            Ver todos →
                        </button>
                    }
                >
                    <div className="space-y-3">
                        {logs.map((log) => (
                            <div key={log.id} className="flex items-start gap-3 pb-3 border-b border-border-light last:border-0 last:pb-0">
                                <SeverityBadge severity={log.severity} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-tertiary truncate">{getActionLabel(log.action)}</p>
                                    <p className="text-[11px] text-secondary mt-0.5 truncate">{log.summary}</p>
                                    <p className="text-[10px] text-secondary/60 mt-0.5">{formatDateTime(log.timestamp)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </SectionCard>
            </div>
        </AppShell>
    );
}
