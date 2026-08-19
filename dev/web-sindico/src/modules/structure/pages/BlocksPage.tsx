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
import { BlockForm } from '@/modules/structure/components/BlockForm.tsx';
import {
  archiveBlock,
  createBlock,
  getBlocks,
  updateBlock,
} from '@/modules/structure/services/blocks.service.ts';
import type { Block, CreateBlockRequest, UpdateBlockRequest } from '@/modules/structure/types.ts';
import { getErrorMessage, isForbiddenError } from '@/services/errors';
import { createEmptyPaginatedResponse } from '@/services/pagination';

const PAGE_SIZE = 10;

export function BlocksPage() {
  const { instanceKey } = useTenantContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<Block | null>(null);
  const [archivingBlock, setArchivingBlock] = useState<Block | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const page = Number(searchParams.get('page') || '1');
  const search = searchParams.get('search') || '';

  useEffect(() => {
    setIsCreateModalOpen(false);
    setEditingBlock(null);
    setArchivingBlock(null);
    setFeedbackMessage(null);
  }, [instanceKey]);

  const blocksQuery = useQuery({
    queryKey: ['structure', 'blocks', instanceKey, { page, search }],
    queryFn: () => getBlocks(instanceKey, { page, limit: PAGE_SIZE, search: search || undefined }),
    enabled: Boolean(instanceKey),
    placeholderData: keepPreviousData,
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateBlockRequest) => createBlock(instanceKey, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['structure', 'blocks', instanceKey] });
      setIsCreateModalOpen(false);
      setFeedbackMessage('Bloco criado com sucesso.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBlockRequest }) =>
      updateBlock(instanceKey, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['structure', 'blocks', instanceKey] });
      setEditingBlock(null);
      setFeedbackMessage('Bloco atualizado com sucesso.');
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (blockId: string) => archiveBlock(instanceKey, blockId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['structure', 'blocks', instanceKey] });
      setArchivingBlock(null);
      setFeedbackMessage('Bloco arquivado com sucesso.');
    },
  });

  const blockRows = blocksQuery.data ?? createEmptyPaginatedResponse<Block>({
    page,
    limit: PAGE_SIZE,
  });

  const handlePageChange = (nextPage: number) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('page', String(nextPage));
    setSearchParams(nextParams);
  };

  const columns = [
    {
      key: 'name',
      header: 'Bloco',
      render: (value: string) => <strong>{value}</strong>,
    },
    {
      key: 'createdAt',
      header: 'Criado em',
      render: (value: string) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(value)),
    },
    {
      key: 'status',
      header: 'Status',
      render: (value: Block['status']) => (
        <StatusBadge
          status={value === 'active' ? 'active' : 'archived'}
          label={value === 'active' ? 'Ativo' : 'Arquivado'}
        />
      ),
    },
  ];

  if (blocksQuery.error && isForbiddenError(blocksQuery.error)) {
    return (
      <PermissionGuard allow={['SINDICO_ADMIN']}>
        <div className="page-stack">
          <PageHeader title="Blocos" description="Gerencie a estrutura fisica do condominio." />
          <ErrorState
            title="Acesso negado aos blocos"
            description="O backend retornou 403 para esta listagem tenant."
            code="403"
          />
        </div>
      </PermissionGuard>
    );
  }

  if (blocksQuery.error) {
    return (
      <PermissionGuard allow={['SINDICO_ADMIN']}>
        <div className="page-stack">
          <PageHeader title="Blocos" description="Gerencie a estrutura fisica do condominio." />
          <ErrorState
            title="Falha ao carregar blocos"
            description={getErrorMessage(blocksQuery.error)}
          />
        </div>
      </PermissionGuard>
    );
  }

  return (
    <PermissionGuard allow={['SINDICO_ADMIN']}>
      <div className="page-stack">
        <PageHeader
          title="Blocos"
          description="Filtros persistem na URL e a listagem continua paginada no backend."
          badge={blocksQuery.isFetching ? 'Atualizando listagem' : undefined}
          actions={
            <button
              type="button"
              className="button button--add"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <Plus size={16} /> Novo bloco
            </button>
          }
        />

        {feedbackMessage ? (
          <div className="inline-feedback inline-feedback--success">{feedbackMessage}</div>
        ) : null}

        <section className="panel-card">
          <div className="panel-card__header">
            <div>
              <h2>Estrutura cadastrada</h2>
              <p>Use a busca para localizar blocos sem perder o tenant ativo ao atualizar a pagina.</p>
            </div>
          </div>
          <div className="panel-card__body page-stack">
            <FilterBar placeholder="Buscar blocos..." />

            <DataTable
              columns={columns}
              data={blockRows.data}
              loading={blocksQuery.isLoading}
              pagination={{
                currentPage: blockRows.pagination.page,
                totalPages: blockRows.pagination.totalPages,
                totalItems: blockRows.pagination.total,
                onPageChange: handlePageChange,
              }}
              actions={(block) => (
                <div className="table-actions">
                  <button
                    type="button"
                    className="table-link"
                    onClick={() => setEditingBlock(block)}
                  >
                    Editar
                  </button>
                  {block.status === 'active' ? (
                    <button
                      type="button"
                      className="table-link table-link--danger"
                      onClick={() => setArchivingBlock(block)}
                    >
                      Arquivar
                    </button>
                  ) : null}
                </div>
              )}
              getRowKey={(block) => block.id}
            />

            {!blocksQuery.isLoading && blockRows.data.length === 0 ? (
              <EmptyState
                title="Nenhum bloco encontrado"
                description="Ajuste a busca ou crie o primeiro bloco desta instancia."
                action={
                  <button
                    type="button"
                    className="button button--add"
                    onClick={() => setIsCreateModalOpen(true)}
                  >
                    Criar bloco
                  </button>
                }
              />
            ) : null}
          </div>
        </section>

        <FormModal isOpen={isCreateModalOpen} title="Novo bloco" onClose={() => setIsCreateModalOpen(false)}>
          <BlockForm
            onSubmit={async (payload) => {
              await createMutation.mutateAsync(payload as CreateBlockRequest);
            }}
            onCancel={() => setIsCreateModalOpen(false)}
            isSubmitting={createMutation.isPending}
            error={createMutation.error}
          />
        </FormModal>

        <FormModal isOpen={Boolean(editingBlock)} title="Editar bloco" onClose={() => setEditingBlock(null)}>
          {editingBlock ? (
            <BlockForm
              block={editingBlock}
              onSubmit={async (payload) => {
                await updateMutation.mutateAsync({
                  id: editingBlock.id,
                  data: payload as UpdateBlockRequest,
                });
              }}
              onCancel={() => setEditingBlock(null)}
              isSubmitting={updateMutation.isPending}
              error={updateMutation.error}
            />
          ) : null}
        </FormModal>

        <ConfirmActionModal
          isOpen={Boolean(archivingBlock)}
          onCancel={() => setArchivingBlock(null)}
          onConfirm={async () => {
            if (!archivingBlock) {
              return;
            }

            await archiveMutation.mutateAsync(archivingBlock.id);
          }}
          title="Arquivar bloco"
          description={`Tem certeza que deseja arquivar ${archivingBlock?.name ?? 'este bloco'}?`}
          confirmLabel="Arquivar"
          variant="danger"
          isLoading={archiveMutation.isPending}
        />
      </div>
    </PermissionGuard>
  );
}
