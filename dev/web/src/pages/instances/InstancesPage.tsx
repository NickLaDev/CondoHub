import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader, SearchInput, FilterBar, Select } from '@/components/ui/PageHeader';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ConfirmDialog, EntityFormModal, Toast } from '@/components/ui/Overlays';
import { Plus, Eye, Pencil, Pause, Play, Building2 } from 'lucide-react';
import { instancesService, plansService } from '@/services';
import type { Instance, PaginatedResponse, Plan } from '@/types';
import { InstanceStatus } from '@/types';
import { formatDate } from '@/hooks/utils';

export function InstancesPage() {
    const navigate = useNavigate();
    const [data, setData] = useState<PaginatedResponse<Instance> | null>(null);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [planFilter, setPlanFilter] = useState('ALL');
    const [page, setPage] = useState(1);

    // Modals
    const [createOpen, setCreateOpen] = useState(false);
    const [editInstance, setEditInstance] = useState<Instance | null>(null);
    const [suspendTarget, setSuspendTarget] = useState<Instance | null>(null);
    const [reactivateTarget, setReactivateTarget] = useState<Instance | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', variant: 'success' as 'success' | 'error' });

    // Form fields (apenas campos persistidos pelo backend)
    const [formName, setFormName] = useState('');
    const [formKey, setFormKey] = useState('');
    const [formPlan, setFormPlan] = useState('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [res, p] = await Promise.all([
                instancesService.list({ search, status: statusFilter, plan: planFilter, page, pageSize: 8 }),
                plansService.list({ page: 1, pageSize: 50 }),
            ]);
            setData(res);
            setPlans(p.data.filter(pl => pl.status === 'ACTIVE'));
        } finally {
            setLoading(false);
        }
    }, [search, statusFilter, planFilter, page]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const resetForm = () => {
        setFormName(''); setFormKey(''); setFormPlan('');
    };

    const openCreate = () => { resetForm(); setCreateOpen(true); };
    const openEdit = (inst: Instance) => {
        setFormName(inst.name); setFormKey(inst.instanceKey); setFormPlan(inst.planId);
        setEditInstance(inst);
    };

    const handleCreate = async () => {
        setActionLoading(true);
        try {
            await instancesService.create({
                name: formName, instanceKey: formKey, planId: formPlan,
            });
            setCreateOpen(false);
            setToast({ show: true, message: 'Instância criada com sucesso!', variant: 'success' });
            fetchData();
        } catch {
            setToast({ show: true, message: 'Erro ao criar instância.', variant: 'error' });
        } finally { setActionLoading(false); }
    };

    const handleEdit = async () => {
        if (!editInstance) return;
        setActionLoading(true);
        try {
            await instancesService.update(editInstance.id, {
                name: formName, planId: formPlan,
            });
            setEditInstance(null);
            setToast({ show: true, message: 'Instância atualizada!', variant: 'success' });
            fetchData();
        } catch {
            setToast({ show: true, message: 'Erro ao editar instância.', variant: 'error' });
        } finally { setActionLoading(false); }
    };

    const handleSuspend = async () => {
        if (!suspendTarget) return;
        setActionLoading(true);
        try {
            await instancesService.suspend(suspendTarget.id);
            setSuspendTarget(null);
            setToast({ show: true, message: 'Instância suspensa com sucesso.', variant: 'success' });
            fetchData();
        } catch {
            setToast({ show: true, message: 'Erro ao suspender instância.', variant: 'error' });
        } finally { setActionLoading(false); }
    };

    const handleReactivate = async () => {
        if (!reactivateTarget) return;
        setActionLoading(true);
        try {
            await instancesService.reactivate(reactivateTarget.id);
            setReactivateTarget(null);
            setToast({ show: true, message: 'Instância reativada!', variant: 'success' });
            fetchData();
        } catch {
            setToast({ show: true, message: 'Erro ao reativar instância.', variant: 'error' });
        } finally { setActionLoading(false); }
    };

    const columns: Column<Instance>[] = [
        {
            key: 'name',
            header: 'Nome',
            render: (inst) => (
                <div>
                    <p className="font-medium text-tertiary">{inst.name}</p>
                    <p className="text-[11px] text-secondary font-mono">{inst.instanceKey}</p>
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            render: (inst) => <StatusBadge status={inst.status} />,
        },
        {
            key: 'plan',
            header: 'Plano',
            render: (inst) => <span className="text-sm text-tertiary">{inst.planName}</span>,
        },
        {
            key: 'createdAt',
            header: 'Criado em',
            render: (inst) => <span className="text-sm text-secondary">{formatDate(inst.createdAt)}</span>,
        },
        {
            key: 'actions',
            header: 'Ações',
            className: 'text-right',
            render: (inst) => (
                <div className="flex items-center justify-end gap-1">
                    <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/admin/instances/${inst.id}`); }}
                        className="p-1.5 rounded-lg hover:bg-surface-secondary text-secondary hover:text-accent transition-colors"
                        title="Ver detalhes"
                    >
                        <Eye size={15} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); openEdit(inst); }}
                        className="p-1.5 rounded-lg hover:bg-surface-secondary text-secondary hover:text-accent transition-colors"
                        title="Editar"
                    >
                        <Pencil size={15} />
                    </button>
                    {inst.status === InstanceStatus.ACTIVE ? (
                        <button
                            onClick={(e) => { e.stopPropagation(); setSuspendTarget(inst); }}
                            className="p-1.5 rounded-lg hover:bg-danger-light text-secondary hover:text-danger transition-colors"
                            title="Suspender"
                        >
                            <Pause size={15} />
                        </button>
                    ) : (
                        <button
                            onClick={(e) => { e.stopPropagation(); setReactivateTarget(inst); }}
                            className="p-1.5 rounded-lg hover:bg-success-light text-secondary hover:text-success transition-colors"
                            title="Reativar"
                        >
                            <Play size={15} />
                        </button>
                    )}
                </div>
            ),
        },
    ];

    const formFields = (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-tertiary mb-1">Nome do condomínio *</label>
                <input value={formName} onChange={(e) => setFormName(e.target.value)} className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" placeholder="Residencial Aurora" />
            </div>
            {!editInstance && (
                <div>
                    <label className="block text-sm font-medium text-tertiary mb-1">Chave da instância *</label>
                    <input value={formKey} onChange={(e) => setFormKey(e.target.value)} className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent font-mono" placeholder="res-aurora" />
                </div>
            )}
            <div>
                <label className="block text-sm font-medium text-tertiary mb-1">Plano *</label>
                <select value={formPlan} onChange={(e) => setFormPlan(e.target.value)} className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                    <option value="">Selecione um plano</option>
                    {plans.map(p => <option key={p.id} value={p.id}>{p.name} — {p.price > 0 ? `R$ ${p.price}` : 'Grátis'}</option>)}
                </select>
            </div>
        </div>
    );

    return (
        <AppShell title="Instâncias" subtitle="Gestão de condomínios da plataforma">
            <PageHeader
                title="Instâncias"
                description="Gerencie todas as instâncias de condomínios cadastradas na plataforma."
                actions={
                    <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-accent transition-all">
                        <Plus size={16} /> Nova instância
                    </button>
                }
            />

            <FilterBar>
                <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Buscar por nome ou chave..." className="w-64" />
                <Select value={statusFilter} onChange={(v) => { setStatusFilter(v); setPage(1); }} options={[
                    { value: 'ALL', label: 'Todos os status' },
                    { value: 'ACTIVE', label: 'Ativas' },
                    { value: 'SUSPENDED', label: 'Suspensas' },
                ]} />
                <Select value={planFilter} onChange={(v) => { setPlanFilter(v); setPage(1); }} options={[
                    { value: 'ALL', label: 'Todos os planos' },
                    ...plans.map(p => ({ value: p.id, label: p.name })),
                ]} />
            </FilterBar>

            <DataTable
                columns={columns}
                data={data?.data || []}
                loading={loading}
                page={data?.page || 1}
                totalPages={data?.totalPages || 1}
                total={data?.total}
                onPageChange={setPage}
                onRowClick={(inst) => navigate(`/admin/instances/${inst.id}`)}
                emptyMessage="Nenhuma instância encontrada"
                emptyIcon={<Building2 size={48} />}
            />

            {/* Create Modal */}
            <EntityFormModal open={createOpen} onClose={() => setCreateOpen(false)} title="Nova instância" subtitle="Cadastrar novo condomínio na plataforma" onSubmit={handleCreate} submitLabel="Criar instância" loading={actionLoading}>
                {formFields}
            </EntityFormModal>

            {/* Edit Modal */}
            <EntityFormModal open={!!editInstance} onClose={() => setEditInstance(null)} title="Editar instância" subtitle={editInstance?.name} onSubmit={handleEdit} submitLabel="Salvar alterações" loading={actionLoading}>
                {formFields}
            </EntityFormModal>

            {/* Suspend Confirm */}
            <ConfirmDialog
                open={!!suspendTarget}
                onClose={() => setSuspendTarget(null)}
                onConfirm={handleSuspend}
                title="Suspender instância"
                message={<>Tem certeza que deseja suspender <strong>{suspendTarget?.name}</strong>? A instância ficará inacessível para todos os usuários.</>}
                confirmLabel="Sim, suspender"
                variant="danger"
                loading={actionLoading}
            />

            {/* Reactivate Confirm */}
            <ConfirmDialog
                open={!!reactivateTarget}
                onClose={() => setReactivateTarget(null)}
                onConfirm={handleReactivate}
                title="Reativar instância"
                message={<>Deseja reativar <strong>{reactivateTarget?.name}</strong>? A instância voltará a ficar disponível.</>}
                confirmLabel="Sim, reativar"
                variant="warning"
                loading={actionLoading}
            />

            <Toast show={toast.show} message={toast.message} variant={toast.variant} onClose={() => setToast({ ...toast, show: false })} />
        </AppShell>
    );
}
