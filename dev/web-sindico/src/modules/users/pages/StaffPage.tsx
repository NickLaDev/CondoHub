import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTenantContext } from '@/app/tenant/tenantContext';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable } from '@/components/data/DataTable';
import { StatusBadge } from '@/components/feedback/StatusBadge';
import { FilterBar } from '@/components/filters/FilterBar';
import { ConfirmActionModal } from '@/components/modals/ConfirmActionModal';
import { FormModal } from '@/components/modals/FormModal';
import { EmptyState } from '@/components/states/EmptyState';
import { ErrorState } from '@/components/states/ErrorState';
import { StaffForm } from '@/modules/users/components/StaffForm';
import {
  createStaff,
  disableStaff,
  getStaff,
  updateStaff,
} from '@/modules/users/services/staff.service';
import type {
  CreateStaffRequest,
  Staff,
  StaffRole,
  UpdateStaffRequest,
} from '@/modules/users/types';
import { getErrorMessage, isForbiddenError } from '@/services/errors';
import { createEmptyPaginatedResponse } from '@/services/pagination';

const PAGE_SIZE = 10;

const roleLabels: Record<StaffRole, string> = {
  FUNC_ENTREGAS: 'Entregas',
  FUNC_MANUTENCAO: 'Manutencao',
};

function getRoleBadge(role: StaffRole) {
  if (role === 'FUNC_ENTREGAS') {
    return { status: 'info' as const, label: roleLabels[role] };
  }

  return { status: 'warning' as const, label: roleLabels[role] };
}

export function StaffPage() {
  const { instanceKey } = useTenantContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [staffToDisable, setStaffToDisable] = useState<Staff | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const page = Number(searchParams.get('page') || '1');
  const search = searchParams.get('search') || '';
  const role = searchParams.get('role') || '';
  const status = searchParams.get('status') || '';

  useEffect(() => {
    setSelectedStaff(null);
    setStaffToDisable(null);
    setIsFormModalOpen(false);
    setFeedbackMessage(null);
  }, [instanceKey]);

  const staffQuery = useQuery({
    queryKey: ['staff', instanceKey, { page, search, role, status }],
    queryFn: () =>
      getStaff(instanceKey, {
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        role: role || undefined,
        status: status || undefined,
      }),
    enabled: Boolean(instanceKey),
    placeholderData: keepPreviousData,
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateStaffRequest) => createStaff(instanceKey, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', instanceKey] });
      setIsFormModalOpen(false);
      setSelectedStaff(null);
      setFeedbackMessage('Funcionario criado com sucesso.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateStaffRequest }) =>
      updateStaff(instanceKey, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', instanceKey] });
      setIsFormModalOpen(false);
      setSelectedStaff(null);
      setFeedbackMessage('Funcionario atualizado com sucesso.');
    },
  });

  const disableMutation = useMutation({
    mutationFn: (staffId: string) => disableStaff(instanceKey, staffId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', instanceKey] });
      setStaffToDisable(null);
      setFeedbackMessage('Funcionario desativado com sucesso.');
    },
  });

  const staffRows = staffQuery.data ?? createEmptyPaginatedResponse<Staff>({
    page,
    limit: PAGE_SIZE,
  });

  const updateParam = (key: string, value: string) => {
    const nextParams = new URLSearchParams(searchParams);

    if (value) {
      nextParams.set(key, value);
    } else {
      nextParams.delete(key);
    }

    nextParams.set('page', '1');
    setSearchParams(nextParams);
  };

  const handlePageChange = (nextPage: number) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('page', String(nextPage));
    setSearchParams(nextParams);
  };

  const columns = [
    {
      key: 'name',
      header: 'Funcionario',
      render: (_value: string, item: Staff) => (
        <div className="table-cell-stack">
          <strong>{item.name}</strong>
          <span>{item.email}</span>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Telefone',
      render: (value: string | undefined) => value || '-',
    },
    {
      key: 'role',
      header: 'Funcao',
      render: (value: StaffRole) => {
        const badge = getRoleBadge(value);
        return <StatusBadge status={badge.status} label={badge.label} />;
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (value: Staff['status']) => (
        <StatusBadge
          status={value === 'active' ? 'active' : 'inactive'}
          label={value === 'active' ? 'Ativo' : 'Inativo'}
        />
      ),
    },
  ];

  if (staffQuery.error && isForbiddenError(staffQuery.error)) {
    return (
      <PermissionGuard allow={['SINDICO_ADMIN']}>
        <div className="page-stack">
          <PageHeader title="Funcionarios" description="Gerencie a equipe operacional da instancia." />
          <ErrorState
            title="Acesso negado aos funcionarios"
            description="O backend retornou 403 para esta listagem tenant."
            code="403"
          />
        </div>
      </PermissionGuard>
    );
  }

  if (staffQuery.error) {
    return (
      <PermissionGuard allow={['SINDICO_ADMIN']}>
        <div className="page-stack">
          <PageHeader title="Funcionarios" description="Gerencie a equipe operacional da instancia." />
          <ErrorState
            title="Falha ao carregar funcionarios"
            description={getErrorMessage(staffQuery.error)}
          />
        </div>
      </PermissionGuard>
    );
  }

  return (
    <PermissionGuard allow={['SINDICO_ADMIN']}>
      <div className="page-stack">
        <PageHeader
          title="Funcionarios"
          description="Controle perfis operacionais com filtros persistidos, debounce e paginacao server-side."
          badge={staffQuery.isFetching ? 'Atualizando listagem' : undefined}
          actions={
            <button
              type="button"
              className="button button--add"
              onClick={() => {
                setSelectedStaff(null);
                setIsFormModalOpen(true);
              }}
            >
              <Plus size={16} /> Novo funcionario
            </button>
          }
        />

        {feedbackMessage ? (
          <div className="inline-feedback inline-feedback--success">{feedbackMessage}</div>
        ) : null}

        <section className="panel-card">
          <div className="panel-card__header">
            <div>
              <h2>Equipe da instancia</h2>
              <p>Filtre por status e funcao sem perder o estado ao recarregar a pagina.</p>
            </div>
          </div>
          <div className="panel-card__body page-stack">
            <FilterBar placeholder="Buscar por nome ou email...">
              <label className="field toolbar-row__field">
                <span className="field__label">Status</span>
                <select
                  className="field__input"
                  value={status}
                  onChange={(event) => updateParam('status', event.target.value)}
                >
                  <option value="">Todos</option>
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                </select>
              </label>

              <label className="field toolbar-row__field">
                <span className="field__label">Funcao</span>
                <select
                  className="field__input"
                  value={role}
                  onChange={(event) => updateParam('role', event.target.value)}
                >
                  <option value="">Todas</option>
                  <option value="FUNC_ENTREGAS">Entregas</option>
                  <option value="FUNC_MANUTENCAO">Manutencao</option>
                </select>
              </label>
            </FilterBar>

            <DataTable
              columns={columns}
              data={staffRows.data}
              loading={staffQuery.isLoading}
              pagination={{
                currentPage: staffRows.pagination.page,
                totalPages: staffRows.pagination.totalPages,
                totalItems: staffRows.pagination.total,
                onPageChange: handlePageChange,
              }}
              actions={(staff) => (
                <div className="table-actions">
                  <button
                    type="button"
                    className="table-link"
                    onClick={() => {
                      setSelectedStaff(staff);
                      setIsFormModalOpen(true);
                    }}
                  >
                    Editar
                  </button>
                  {staff.status === 'active' ? (
                    <button
                      type="button"
                      className="table-link table-link--danger"
                      onClick={() => setStaffToDisable(staff)}
                    >
                      Desativar
                    </button>
                  ) : null}
                </div>
              )}
              getRowKey={(staff) => staff.id}
            />

            {!staffQuery.isLoading && staffRows.data.length === 0 ? (
              <EmptyState
                title="Nenhum funcionario encontrado"
                description="Ajuste os filtros ou cadastre um novo perfil operacional."
                action={
                  <button
                    type="button"
                    className="button button--add"
                    onClick={() => {
                      setSelectedStaff(null);
                      setIsFormModalOpen(true);
                    }}
                  >
                    Cadastrar funcionario
                  </button>
                }
              />
            ) : null}
          </div>
        </section>

        <FormModal
          isOpen={isFormModalOpen}
          onClose={() => {
            setIsFormModalOpen(false);
            setSelectedStaff(null);
          }}
          title={selectedStaff ? 'Editar funcionario' : 'Novo funcionario'}
        >
          <StaffForm
            instanceKey={instanceKey}
            staff={selectedStaff ?? undefined}
            onSubmit={async (payload) => {
              if (selectedStaff) {
                await updateMutation.mutateAsync({
                  id: selectedStaff.id,
                  data: payload as UpdateStaffRequest,
                });
                return;
              }

              await createMutation.mutateAsync(payload as CreateStaffRequest);
            }}
            onCancel={() => {
              setIsFormModalOpen(false);
              setSelectedStaff(null);
            }}
            isSubmitting={createMutation.isPending || updateMutation.isPending}
            error={createMutation.error || updateMutation.error}
          />
        </FormModal>

        <ConfirmActionModal
          isOpen={Boolean(staffToDisable)}
          onCancel={() => setStaffToDisable(null)}
          onConfirm={async () => {
            if (!staffToDisable) {
              return;
            }

            await disableMutation.mutateAsync(staffToDisable.id);
          }}
          title="Desativar funcionario"
          description={`Tem certeza que deseja desativar ${staffToDisable?.name ?? 'este funcionario'}?`}
          confirmLabel="Desativar"
          variant="danger"
          isLoading={disableMutation.isPending}
        />
      </div>
    </PermissionGuard>
  );
}
