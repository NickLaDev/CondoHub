import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { SectionCard } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ArrowLeft, Building2, MapPin, Users, Calendar, Mail, User, CreditCard, Settings, UserPlus, LayoutGrid, ScrollText, Lock } from 'lucide-react';
import { instancesService, logsService } from '@/services';
import type { Instance, AuditLog } from '@/types';
import { formatDate, formatDateTime } from '@/hooks/utils';

export function InstanceDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [instance, setInstance] = useState<Instance | null>(null);
    const [relatedLogs, setRelatedLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        instancesService.getById(id).then(setInstance).finally(() => setLoading(false));
        logsService
            .list({ instanceId: id, page: 1, pageSize: 5 })
            .then((res) => setRelatedLogs(res.data))
            .catch(() => setRelatedLogs([]));
    }, [id]);

    if (loading) {
        return (
            <AppShell title="Detalhe da instância" subtitle="Carregando...">
                <div className="space-y-4">
                    <div className="skeleton h-8 w-48 mb-6" />
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="lg:col-span-2 skeleton h-64 rounded-xl" />
                        <div className="skeleton h-64 rounded-xl" />
                    </div>
                </div>
            </AppShell>
        );
    }

    if (!instance) {
        return (
            <AppShell title="Instância não encontrada">
                <div className="text-center py-16">
                    <p className="text-secondary">Instância não encontrada.</p>
                    <button onClick={() => navigate('/admin/instances')} className="mt-4 text-accent text-sm font-medium hover:underline">
                        Voltar para instâncias
                    </button>
                </div>
            </AppShell>
        );
    }

    const futureExpansions = [
        { icon: Building2, label: 'Perfil do condomínio', description: 'Dados completos do condo' },
        { icon: LayoutGrid, label: 'Estrutura', description: 'Blocos, torres e unidades' },
        { icon: Users, label: 'Usuários', description: 'Moradores e administradores' },
        { icon: UserPlus, label: 'Convites', description: 'Convites pendentes' },
    ];

    return (
        <AppShell title={instance.name} subtitle={`Detalhes da instância ${instance.instanceKey}`}>
            {/* Back button */}
            <button
                onClick={() => navigate('/admin/instances')}
                className="flex items-center gap-1.5 text-sm text-secondary hover:text-accent transition-colors mb-5"
            >
                <ArrowLeft size={16} /> Voltar para instâncias
            </button>

            {/* Summary header */}
            <div className="bg-white rounded-xl border border-border p-6 mb-6">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            <Building2 size={28} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-tertiary">{instance.name}</h2>
                            <p className="text-sm text-secondary font-mono mt-0.5">{instance.instanceKey}</p>
                        </div>
                    </div>
                    <StatusBadge status={instance.status} />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                {/* Main info */}
                <div className="lg:col-span-2">
                    <SectionCard title="Dados principais">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-8">
                            <div className="flex items-start gap-3">
                                <MapPin size={16} className="text-secondary mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-[11px] text-secondary uppercase tracking-wider font-medium">Endereço</p>
                                    <p className="text-sm text-tertiary mt-0.5">{instance.address || '—'}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Users size={16} className="text-secondary mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-[11px] text-secondary uppercase tracking-wider font-medium">Unidades</p>
                                    <p className="text-sm text-tertiary mt-0.5">{instance.units || '—'}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <CreditCard size={16} className="text-secondary mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-[11px] text-secondary uppercase tracking-wider font-medium">Plano</p>
                                    <p className="text-sm text-tertiary mt-0.5">{instance.planName}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Calendar size={16} className="text-secondary mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-[11px] text-secondary uppercase tracking-wider font-medium">Criado em</p>
                                    <p className="text-sm text-tertiary mt-0.5">{formatDate(instance.createdAt)}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <User size={16} className="text-secondary mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-[11px] text-secondary uppercase tracking-wider font-medium">Administrador</p>
                                    <p className="text-sm text-tertiary mt-0.5">{instance.adminName || '—'}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Mail size={16} className="text-secondary mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-[11px] text-secondary uppercase tracking-wider font-medium">Email Admin</p>
                                    <p className="text-sm text-tertiary mt-0.5">{instance.adminEmail || '—'}</p>
                                </div>
                            </div>
                        </div>
                    </SectionCard>
                </div>

                {/* Quick actions */}
                <SectionCard title="Ações rápidas">
                    <div className="space-y-2">
                        <button
                            onClick={() => navigate('/admin/support')}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border hover:border-accent/30 hover:bg-blue-50/30 transition-all text-left"
                        >
                            <Settings size={16} className="text-accent" />
                            <span className="text-sm text-tertiary">Resetar síndico</span>
                        </button>
                        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border hover:border-accent/30 hover:bg-blue-50/30 transition-all text-left">
                            <CreditCard size={16} className="text-accent" />
                            <span className="text-sm text-tertiary">Alterar plano</span>
                        </button>
                        <button
                            onClick={() => navigate('/admin/logs')}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border hover:border-accent/30 hover:bg-blue-50/30 transition-all text-left"
                        >
                            <ScrollText size={16} className="text-accent" />
                            <span className="text-sm text-tertiary">Ver logs</span>
                        </button>
                    </div>
                </SectionCard>
            </div>

            {/* Related logs */}
            <SectionCard title="Logs relacionados" subtitle="Últimas ações nesta instância" className="mb-6">
                {relatedLogs.length === 0 ? (
                    <p className="text-sm text-secondary py-4 text-center">Nenhum log encontrado para esta instância.</p>
                ) : (
                    <div className="space-y-3">
                        {relatedLogs.map((log) => (
                            <div key={log.id} className="flex items-center gap-4 py-2 border-b border-border-light last:border-0">
                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${log.severity === 'CRITICAL' ? 'bg-danger' : log.severity === 'WARNING' ? 'bg-warning' : 'bg-accent'
                                    }`} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-tertiary truncate">{log.summary}</p>
                                    <p className="text-[11px] text-secondary">{formatDateTime(log.timestamp)} — {log.actor}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </SectionCard>

            {/* Future expansions */}
            <SectionCard title="Expansões futuras" subtitle="Módulos disponíveis em versões futuras">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {futureExpansions.map((exp) => (
                        <div key={exp.label} className="relative flex items-center gap-3 px-4 py-3 rounded-lg border border-dashed border-border bg-surface-secondary/40 opacity-60">
                            <exp.icon size={18} className="text-secondary" />
                            <div>
                                <p className="text-sm font-medium text-secondary">{exp.label}</p>
                                <p className="text-[10px] text-secondary/60">{exp.description}</p>
                            </div>
                            <Lock size={12} className="absolute top-2 right-2 text-secondary/40" />
                        </div>
                    ))}
                </div>
            </SectionCard>
        </AppShell>
    );
}
