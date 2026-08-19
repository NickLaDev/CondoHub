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
import { UnitForm } from '@/modules/structure/components/UnitForm';
import { getBlocks } from '@/modules/structure/services/blocks.service';
import {
  archiveUnit,
  createUnit,
  getUnits,
  updateUnit,
} from '@/modules/structure/services/units.service';
import type { Block, CreateUnitRequest, Unit, UpdateUnitRequest } from '@/modules/structure/types';
import { getErrorMessage, isForbiddenError } from '@/services/errors';
import { createEmptyPaginatedResponse } from '@/services/pagination';

const PAGE_SIZE = 10;

export function UnitsPage() {
  const { instanceKey } = useTenantContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [archivingUnit, setArchivingUnit] = useState<Unit | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const page = Number(searchParams.get('page') || '1');
  const search = searchParams.get('search') || '';
  const blockId = searchParams.get('blockId') || '';

  useEffect(() => {
    setIsCreateModalOpen(false);
    setEditingUnit(null);
    setArchivingUnit(null);
    setFeedbackMessage(null);
  }, [instanceKey]);

  const unitsQuery = useQuery({
    queryKey: ['structure', 'units', instanceKey, { page, search, blockId }],
    queryFn: () =>
      getUnits(instanceKey, {
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        blockId: blockId || undefined,
      }),
    enabled: Boolean(instanceKey),
    placeholderData: keepPreviousData,
  });

  const blocksQuery = useQuery({
    queryKey: ['structure', 'blocks', instanceKey, 'unit-filter'],
    queryFn: () => getBlocks(instanceKey, { page: 1, limit: 100 }),
    enabled: Boolean(instanceKey),
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateUnitRequest) => createUnit(instanceKey, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['structure', 'units', instanceKey] });
      setIsCreateModalOpen(false);
      setFeedbackMessage('Unidade criada com sucesso.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUnitRequest }) =>
      updateUnit(instanceKey, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['structure', 'units', instanceKey] });
      setEditingUnit(null);
      setFeedbackMessage('Unidade atualizada com sucesso.');
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (unitId: string) => archiveUnit(instanceKey, unitId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['structure', 'units', instanceKey] });
      setArchivingUnit(null);
      setFeedbackMessage('Unidade arquivada com sucesso.');
    },
  });

  const unitRows = unitsQuery.data ?? createEmptyPaginatedResponse<Unit>({
    page,
    limit: PAGE_SIZE,
  });

  const blockOptions = useMemo(
    () => (blocksQuery.data?.data ?? []).filter((item) => item.status === 'active'),
    [blocksQuery.data?.data],
  );

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
      key: 'block',
      header: 'Bloco',
      render: (value: Block) => value.name,
    },
    {
      key: 'number',
      header: 'Numero',
      render: (value: string) => <strong>{value}</strong>,
    },
    {
      key: 'createdAt',
      header: 'Criada em',
      render: (value: string) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(value)),
    },
    {
      key: 'status',
      header: 'Status',
      render: (value: Unit['status']) => (
        <StatusBadge
          status={value === 'active' ? 'active' : 'archived'}
          label={value === 'active' ? 'Ativa' : 'Arquivada'}
        />
      ),
    },
  ];

  if (unitsQuery.error && isForbiddenError(unitsQuery.error)) {
    return (
      <PermissionGuard allow={['SINDICO_ADMIN']}>
        <div className="page-stack">
          <PageHeader title="Unidades" description="Gerencie as unidades do condominio." />
          <ErrorState
            title="Acesso negado as unidades"
            description="O backend retornou 403 para esta listagem tenant."
            code="403"
          />
        </div>
      </PermissionGuard>
    );
  }

  if (unitsQuery.error) {
    return (
      <PermissionGuard allow={['SINDICO_ADMIN']}>
        <div className="page-stack">
          <PageHeader title="Unidades" description="Gerencie as unidades do condominio." />
          <ErrorState
            title="Falha ao carregar unidades"
            description={getErrorMessage(unitsQuery.error)}
          />
        </div>
      </PermissionGuard>
    );
  }

  return (
    <PermissionGuard allow={['SINDICO_ADMIN']}>
      <div className="page-stack">
        <PageHeader
          title="Unidades"
          description="Listagem por tenant com filtros persistidos, busca debounced e paginacao de backend."
          badge={unitsQuery.isFetching ? 'Atualizando listagem' : undefined}
          actions={
            <button
              type="button"
              className="button button--add"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <Plus size={16} /> Nova unidade
            </button>
          }
        />

        {feedbackMessage ? (
          <div className="inline-feedback inline-feedback--success">{feedbackMessage}</div>
        ) : null}

        <section className="panel-card">
          <div className="panel-card__header">
            <div>
              <h2>Unidades cadastradas</h2>
              <p>Filtre por bloco e busca textual sem perder o contexto da URL ao recarregar a pagina.</p>
            </div>
          </div>
          <div className="panel-card__body page-stack">
            <FilterBar placeholder="Buscar por numero...">
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
            </FilterBar>

            <DataTable
              columns={columns}
              data={unitRows.data}
              loading={unitsQuery.isLoading}
              pagination={{
                currentPage: unitRows.pagination.page,
                totalPages: unitRows.pagination.totalPages,
                totalItems: unitRows.pagination.total,
                onPageChange: handlePageChange,
              }}
              actions={(unit) => (
                <div className="table-actions">
                  <button
                    type="button"
                    className="table-link"
                    onClick={() => setEditingUnit(unit)}
                  >
                    Editar
                  </button>
                  {unit.status === 'active' ? (
                    <button
                      type="button"
                      className="table-link table-link--danger"
                      onClick={() => setArchivingUnit(unit)}
                    >
                      Arquivar
                    </button>
                  ) : null}
                </div>
              )}
              getRowKey={(unit) => unit.id}
            />

            {!unitsQuery.isLoading && unitRows.data.length === 0 ? (
              <EmptyState
                title="Nenhuma unidade encontrada"
                description="Ajuste os filtros ou cadastre a primeira unidade desta instancia."
                action={
                  <button
                    type="button"
                    className="button button--add"
                    onClick={() => setIsCreateModalOpen(true)}
                  >
                    Criar unidade
                  </button>
                }
              />
            ) : null}
          </div>
        </section>

        <FormModal isOpen={isCreateModalOpen} title="Nova unidade" onClose={() => setIsCreateModalOpen(false)}>
          <UnitForm
            instanceKey={instanceKey}
            onSubmit={async (payload) => {
              await createMutation.mutateAsync(payload as CreateUnitRequest);
            }}
            onCancel={() => setIsCreateModalOpen(false)}
            isSubmitting={createMutation.isPending}
            error={createMutation.error}
          />
        </FormModal>

        <FormModal isOpen={Boolean(editingUnit)} title="Editar unidade" onClose={() => setEditingUnit(null)}>
          {editingUnit ? (
            <UnitForm
              instanceKey={instanceKey}
              unit={editingUnit}
              onSubmit={async (payload) => {
                await updateMutation.mutateAsync({
                  id: editingUnit.id,
                  data: payload as UpdateUnitRequest,
                });
              }}
              onCancel={() => setEditingUnit(null)}
              isSubmitting={updateMutation.isPending}
              error={updateMutation.error}
            />
          ) : null}
        </FormModal>

        <ConfirmActionModal
          isOpen={Boolean(archivingUnit)}
          onCancel={() => setArchivingUnit(null)}
          onConfirm={async () => {
            if (!archivingUnit) {
              return;
            }

            await archiveMutation.mutateAsync(archivingUnit.id);
          }}
          title="Arquivar unidade"
          description={`Tem certeza que deseja arquivar ${archivingUnit ? `${archivingUnit.block.name} - ${archivingUnit.number}` : 'esta unidade'}?`}
          confirmLabel="Arquivar"
          variant="danger"
          isLoading={archiveMutation.isPending}
        />
      </div>
    </PermissionGuard>
  );
}
