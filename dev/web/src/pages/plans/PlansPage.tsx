import { useEffect, useState, useCallback } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader, SearchInput, FilterBar, Select } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ConfirmDialog, EntityFormModal, Toast } from '@/components/ui/Overlays';
import { Plus, Pencil, Archive, CreditCard, Check } from 'lucide-react';
import { plansService } from '@/services';
import type { Plan, PaginatedResponse } from '@/types';
import { PlanStatus } from '@/types';
import { formatCurrency, cn } from '@/hooks/utils';

export function PlansPage() {
    const [data, setData] = useState<PaginatedResponse<Plan> | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    const [createOpen, setCreateOpen] = useState(false);
    const [editPlan, setEditPlan] = useState<Plan | null>(null);
    const [archiveTarget, setArchiveTarget] = useState<Plan | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', variant: 'success' as 'success' | 'error' });

    const [formName, setFormName] = useState('');
    const [formSlug, setFormSlug] = useState('');
    const [formPrice, setFormPrice] = useState('');
    const [formDesc, setFormDesc] = useState('');
    const [formMaxUnits, setFormMaxUnits] = useState('');
    const [formFeatures, setFormFeatures] = useState('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await plansService.list({ search, status: statusFilter, page: 1, pageSize: 50 });
            setData(res);
        } finally { setLoading(false); }
    }, [search, statusFilter]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const resetForm = () => {
        setFormName(''); setFormSlug(''); setFormPrice(''); setFormDesc(''); setFormMaxUnits(''); setFormFeatures('');
    };

    const openCreate = () => { resetForm(); setCreateOpen(true); };
    const openEdit = (plan: Plan) => {
        setFormName(plan.name); setFormSlug(plan.slug); setFormPrice(String(plan.price));
        setFormDesc(plan.description || ''); setFormMaxUnits(String(plan.maxUnits || ''));
        setFormFeatures(plan.features.join('\n'));
        setEditPlan(plan);
    };

    const handleCreate = async () => {
        setActionLoading(true);
        try {
            await plansService.create({
                name: formName, slug: formSlug, price: Number(formPrice),
                features: formFeatures.split('\n').filter(Boolean),
                description: formDesc, maxUnits: formMaxUnits ? Number(formMaxUnits) : undefined,
            });
            setCreateOpen(false);
            setToast({ show: true, message: 'Plano criado com sucesso!', variant: 'success' });
            fetchData();
        } catch {
            setToast({ show: true, message: 'Erro ao criar plano.', variant: 'error' });
        } finally { setActionLoading(false); }
    };

    const handleEdit = async () => {
        if (!editPlan) return;
        setActionLoading(true);
        try {
            await plansService.update(editPlan.id, {
                name: formName, price: Number(formPrice),
                features: formFeatures.split('\n').filter(Boolean),
                description: formDesc, maxUnits: formMaxUnits ? Number(formMaxUnits) : undefined,
            });
            setEditPlan(null);
            setToast({ show: true, message: 'Plano atualizado!', variant: 'success' });
            fetchData();
        } catch {
            setToast({ show: true, message: 'Erro ao editar plano.', variant: 'error' });
        } finally { setActionLoading(false); }
    };

    const handleArchive = async () => {
        if (!archiveTarget) return;
        setActionLoading(true);
        try {
            await plansService.archive(archiveTarget.id);
            setArchiveTarget(null);
            setToast({ show: true, message: 'Plano arquivado.', variant: 'success' });
            fetchData();
        } catch {
            setToast({ show: true, message: 'Erro ao arquivar plano.', variant: 'error' });
        } finally { setActionLoading(false); }
    };

    const formFields = (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-sm font-medium text-tertiary mb-1">Nome *</label>
                    <input value={formName} onChange={(e) => setFormName(e.target.value)} className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" placeholder="Profissional" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-tertiary mb-1">Slug *</label>
                    <input value={formSlug} onChange={(e) => setFormSlug(e.target.value)} className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent font-mono" placeholder="profissional" disabled={!!editPlan} />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-sm font-medium text-tertiary mb-1">Preço (R$) *</label>
                    <input type="number" step="0.01" value={formPrice} onChange={(e) => setFormPrice(e.target.value)} className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" placeholder="349.90" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-tertiary mb-1">Máx. unidades</label>
                    <input type="number" value={formMaxUnits} onChange={(e) => setFormMaxUnits(e.target.value)} className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" placeholder="300" />
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-tertiary mb-1">Descrição</label>
                <input value={formDesc} onChange={(e) => setFormDesc(e.target.value)} className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" placeholder="Para condomínios de médio porte" />
            </div>
            <div>
                <label className="block text-sm font-medium text-tertiary mb-1">Benefícios (um por linha)</label>
                <textarea value={formFeatures} onChange={(e) => setFormFeatures(e.target.value)} rows={5} className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none" placeholder="Até 300 unidades&#10;Tickets com SLA&#10;Suporte prioritário" />
            </div>
        </div>
    );

    const plans = data?.data || [];

    return (
        <AppShell title="Planos" subtitle="Gestão de planos de assinatura">
            <PageHeader
                title="Planos"
                description="Gerencie os planos de assinatura disponíveis na plataforma."
                actions={
                    <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-accent transition-all">
                        <Plus size={16} /> Novo plano
                    </button>
                }
            />

            <FilterBar>
                <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nome ou slug..." className="w-64" />
                <Select value={statusFilter} onChange={setStatusFilter} options={[
                    { value: 'ALL', label: 'Todos os status' },
                    { value: 'ACTIVE', label: 'Ativos' },
                    { value: 'ARCHIVED', label: 'Arquivados' },
                ]} />
            </FilterBar>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="bg-white rounded-xl border border-border p-6">
                            <div className="skeleton h-6 w-32 mb-4" />
                            <div className="skeleton h-8 w-24 mb-4" />
                            <div className="space-y-2">{Array.from({ length: 4 }).map((_, j) => <div key={j} className="skeleton h-3 w-full" />)}</div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {plans.map((plan) => (
                        <div key={plan.id} className={cn(
                            'bg-white rounded-xl border border-border overflow-hidden transition-all hover:shadow-md',
                            plan.status === PlanStatus.ARCHIVED && 'opacity-60'
                        )}>
                            <div className="p-6">
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <h3 className="text-lg font-bold text-tertiary">{plan.name}</h3>
                                        <p className="text-xs text-secondary font-mono">{plan.slug}</p>
                                    </div>
                                    <StatusBadge status={plan.status} size="sm" />
                                </div>

                                <div className="mb-4">
                                    <p className="text-2xl font-bold text-primary">
                                        {plan.price > 0 ? formatCurrency(plan.price) : 'Grátis'}
                                        {plan.price > 0 && <span className="text-sm font-normal text-secondary">/mês</span>}
                                    </p>
                                    {plan.description && (
                                        <p className="text-xs text-secondary mt-1">{plan.description}</p>
                                    )}
                                </div>

                                <div className="mb-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <CreditCard size={14} className="text-secondary" />
                                        <span className="text-xs text-secondary">
                                            {plan.instanceCount} {plan.instanceCount === 1 ? 'instância vinculada' : 'instâncias vinculadas'}
                                        </span>
                                    </div>
                                    {plan.maxUnits && (
                                        <p className="text-xs text-secondary">Até {plan.maxUnits} unidades</p>
                                    )}
                                </div>

                                <div className="space-y-1.5 mb-5">
                                    {plan.features.map((f, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <Check size={14} className="text-success flex-shrink-0" />
                                            <span className="text-xs text-tertiary">{f}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="border-t border-border px-6 py-3 bg-surface-secondary/30 flex items-center gap-2">
                                <button
                                    onClick={() => openEdit(plan)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-secondary hover:text-accent hover:bg-white rounded-lg transition-all"
                                >
                                    <Pencil size={13} /> Editar
                                </button>
                                {plan.status === PlanStatus.ACTIVE && (
                                    <button
                                        onClick={() => setArchiveTarget(plan)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-secondary hover:text-danger hover:bg-danger-light rounded-lg transition-all"
                                    >
                                        <Archive size={13} /> Arquivar
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <EntityFormModal open={createOpen} onClose={() => setCreateOpen(false)} title="Novo plano" subtitle="Criar novo plano de assinatura" onSubmit={handleCreate} submitLabel="Criar plano" loading={actionLoading} size="lg">
                {formFields}
            </EntityFormModal>

            <EntityFormModal open={!!editPlan} onClose={() => setEditPlan(null)} title="Editar plano" subtitle={editPlan?.name} onSubmit={handleEdit} submitLabel="Salvar alterações" loading={actionLoading} size="lg">
                {formFields}
            </EntityFormModal>

            <ConfirmDialog
                open={!!archiveTarget}
                onClose={() => setArchiveTarget(null)}
                onConfirm={handleArchive}
                title="Arquivar plano"
                message={<>Tem certeza que deseja arquivar o plano <strong>{archiveTarget?.name}</strong>? Ele não estará mais disponível para novas instâncias.</>}
                confirmLabel="Sim, arquivar"
                variant="warning"
                loading={actionLoading}
            />

            <Toast show={toast.show} message={toast.message} variant={toast.variant} onClose={() => setToast({ ...toast, show: false })} />
        </AppShell>
    );
}
