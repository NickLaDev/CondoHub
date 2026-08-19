import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
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
import { ResidentForm } from '@/modules/users/components/ResidentForm';
import {
  createResident,
  disableResident,
  getResidents,
  updateResident,
} from '@/modules/users/services/residents.service';
import type {
  CreateResidentRequest,
  Resident,
  UpdateResidentRequest,
} from '@/modules/users/types';
import { getBlocks } from '@/modules/structure/services/blocks.service';
import { getUnits } from '@/modules/structure/services/units.service';
import { getErrorMessage, isForbiddenError } from '@/services/errors';
import { createEmptyPaginatedResponse } from '@/services/pagination';

const PAGE_SIZE = 10;

export function ResidentsPage() {
  const { instanceKey } = useTenantContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
  const [residentToDisable, setResidentToDisable] = useState<Resident | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const page = Number(searchParams.get('page') || '1');
  const search = searchParams.get('search') || '';
  const blockId = searchParams.get('blockId') || '';
  const unitId = searchParams.get('unitId') || '';
  const status = searchParams.get('status') || '';

  useEffect(() => {
    setSelectedResident(null);
    setResidentToDisable(null);
    setIsFormModalOpen(false);
    setFeedbackMessage(null);
  }, [instanceKey]);

  const residentsQuery = useQuery({
    queryKey: ['residents', instanceKey, { page, search, blockId, unitId, status }],
    queryFn: () =>
      getResidents(instanceKey, {
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        blockId: blockId || undefined,
        unitId: unitId || undefined,
        status: status || undefined,
      }),
    enabled: Boolean(instanceKey),
    placeholderData: keepPreviousData,
  });

  const blocksQuery = useQuery({
    queryKey: ['residents', instanceKey, 'blocks-filter'],
    queryFn: () => getBlocks(instanceKey, { page: 1, limit: 100 }),
    enabled: Boolean(instanceKey),
  });

  const unitsQuery = useQuery({
    queryKey: ['residents', instanceKey, 'units-filter', blockId],
    queryFn: () => getUnits(instanceKey, { page: 1, limit: 200, blockId: blockId || undefined }),
    enabled: Boolean(instanceKey) && Boolean(blockId),
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateResidentRequest) => createResident(instanceKey, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['residents', instanceKey] });
      setIsFormModalOpen(false);
      setSelectedResident(null);
      setFeedbackMessage('Morador criado com sucesso.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateResidentRequest }) =>
      updateResident(instanceKey, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['residents', instanceKey] });
      setIsFormModalOpen(false);
      setSelectedResident(null);
      setFeedbackMessage('Morador atualizado com sucesso.');
    },
  });

  const disableMutation = useMutation({
    mutationFn: (residentId: string) => disableResident(instanceKey, residentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['residents', instanceKey] });
      setResidentToDisable(null);
      setFeedbackMessage('Morador desativado com sucesso.');
    },
  });

  const residentRows = residentsQuery.data ?? createEmptyPaginatedResponse<Resident>({
    page,
    limit: PAGE_SIZE,
  });

  const blockOptions = useMemo(
    () => (blocksQuery.data?.data ?? []).filter((item) => item.status === 'active'),
    [blocksQuery.data?.data],
  );

  const unitOptions = useMemo(
    () => (unitsQuery.data?.data ?? []).filter((item) => item.status === 'active'),
    [unitsQuery.data?.data],
  );

  const updateParam = (key: string, value: string) => {
    const nextParams = new URLSearchParams(searchParams);

    if (value) {
      nextParams.set(key, value);
    } else {
      nextParams.delete(key);
    }

    if (key === 'blockId' && !value) {
      nextParams.delete('unitId');
    }

    if (key === 'blockId' && value && unitId) {
      nextParams.delete('unitId');
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
      header: 'Morador',
      render: (_value: string, item: Resident) => (
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
      key: 'unit',
      header: 'Unidade',
      render: (value: Resident['unit']) => `${value.block.name} - ${value.number}`,
    },
    {
      key: 'status',
      header: 'Status',
      render: (value: Resident['status']) => (
        <StatusBadge
          status={value === 'active' ? 'active' : 'inactive'}
          label={value === 'active' ? 'Ativo' : 'Inativo'}
        />
      ),
    },
  ];

  if (residentsQuery.error && isForbiddenError(residentsQuery.error)) {
    return (
      <PermissionGuard allow={['SINDICO_ADMIN']}>
        <div className="page-stack">
          <PageHeader title="Moradores" description="Gerencie os moradores da instancia." />
          <ErrorState
            title="Acesso negado aos moradores"
            description="O backend retornou 403 para esta listagem tenant."
            code="403"
          />
        </div>
      </PermissionGuard>
    );
  }

  if (residentsQuery.error) {
    return (
      <PermissionGuard allow={['SINDICO_ADMIN']}>
        <div className="page-stack">
          <PageHeader title="Moradores" description="Gerencie os moradores da instancia." />
          <ErrorState
            title="Falha ao carregar moradores"
            description={getErrorMessage(residentsQuery.error)}
          />
        </div>
      </PermissionGuard>
    );
  }

  return (
    <PermissionGuard allow={['SINDICO_ADMIN']}>
      <div className="page-stack">
        <PageHeader
          title="Moradores"
          description="Filtros persistem na URL e a paginacao continua no backend por tenant."
          badge={residentsQuery.isFetching ? 'Atualizando listagem' : undefined}
          actions={
            <button
              type="button"
              className="button button--add"
              onClick={() => {
                setSelectedResident(null);
                setIsFormModalOpen(true);
              }}
            >
              <Plus size={16} /> Novo morador
            </button>
          }
        />

        {feedbackMessage ? (
          <div className="inline-feedback inline-feedback--success">{feedbackMessage}</div>
        ) : null}

        <section className="panel-card">
          <div className="panel-card__header">
            <div>
              <h2>Base de moradores</h2>
              <p>Busque por nome, email, bloco, unidade e status sem misturar dados entre tenants.</p>
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
                <span className="field__label">Bloco</span>
                <select
                  className="field__input"
                  value={blockId}
                  onChange={(event) => updateParam('blockId', event.target.value)}
                >
                  <option value="">Todos</option>
                  {blockOptions.map((block) => (
                    <option key={block.id} value={block.id}>
                      {block.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field toolbar-row__field">
                <span className="field__label">Unidade</span>
                <select
                  className="field__input"
                  value={unitId}
                  onChange={(event) => updateParam('unitId', event.target.value)}
                  disabled={!blockId}
                >
                  <option value="">Todas</option>
                  {unitOptions.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.number}
                    </option>
                  ))}
                </select>
              </label>
            </FilterBar>

            <DataTable
              columns={columns}
              data={residentRows.data}
              loading={residentsQuery.isLoading}
              pagination={{
                currentPage: residentRows.pagination.page,
                totalPages: residentRows.pagination.totalPages,
                totalItems: residentRows.pagination.total,
                onPageChange: handlePageChange,
              }}
              actions={(resident) => (
                <div className="table-actions">
                  <button
                    type="button"
                    className="table-link"
                    onClick={() => {
                      setSelectedResident(resident);
                      setIsFormModalOpen(true);
                    }}
                  >
                    Editar
                  </button>
                  {resident.status === 'active' ? (
                    <button
                      type="button"
                      className="table-link table-link--danger"
                      onClick={() => setResidentToDisable(resident)}
                    >
                      Desativar
                    </button>
                  ) : null}
                </div>
              )}
              getRowKey={(resident) => resident.id}
            />

            {!residentsQuery.isLoading && residentRows.data.length === 0 ? (
              <EmptyState
                title="Nenhum morador encontrado"
                description="Ajuste os filtros ou cadastre um novo morador para esta instancia."
                action={
                  <button
                    type="button"
                    className="button button--add"
                    onClick={() => {
                      setSelectedResident(null);
                      setIsFormModalOpen(true);
                    }}
                  >
                    Cadastrar morador
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
            setSelectedResident(null);
          }}
          title={selectedResident ? 'Editar morador' : 'Novo morador'}
        >
          <ResidentForm
            instanceKey={instanceKey}
            resident={selectedResident ?? undefined}
            onSubmit={async (payload) => {
              if (selectedResident) {
                await updateMutation.mutateAsync({
                  id: selectedResident.id,
                  data: payload as UpdateResidentRequest,
                });
                return;
              }

              await createMutation.mutateAsync(payload as CreateResidentRequest);
            }}
            onCancel={() => {
              setIsFormModalOpen(false);
              setSelectedResident(null);
            }}
            isSubmitting={createMutation.isPending || updateMutation.isPending}
            error={createMutation.error || updateMutation.error}
          />
        </FormModal>

        <ConfirmActionModal
          isOpen={Boolean(residentToDisable)}
          onCancel={() => setResidentToDisable(null)}
          onConfirm={async () => {
            if (!residentToDisable) {
              return;
            }

            await disableMutation.mutateAsync(residentToDisable.id);
          }}
          title="Desativar morador"
          description={`Tem certeza que deseja desativar ${residentToDisable?.name ?? 'este morador'}?`}
          confirmLabel="Desativar"
          variant="danger"
          isLoading={disableMutation.isPending}
        />
      </div>
    </PermissionGuard>
  );
}
