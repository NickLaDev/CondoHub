import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useTenantContext } from '@/app/tenant/tenantContext';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { PageHeader } from '@/components/common/PageHeader';
import { FilterBar } from '@/components/filters/FilterBar';
import { ConfirmActionModal } from '@/components/modals/ConfirmActionModal';
import { EmptyState } from '@/components/states/EmptyState';
import { ErrorState } from '@/components/states/ErrorState';
import { InboxComposer } from '@/modules/inbox/components/InboxComposer';
import { InboxMessageList } from '@/modules/inbox/components/InboxMessageList';
import { InboxStatusControl } from '@/modules/inbox/components/InboxStatusControl';
import { InboxThreadList } from '@/modules/inbox/components/InboxThreadList';
import {
  formatInboxDateTime,
  getInboxStatusBadge,
  getInboxThreadUnitLabel,
} from '@/modules/inbox/helpers';
import {
  emptyInboxThreadsResponse,
  getInboxThreads,
  postInboxMessage,
  updateInboxStatus,
} from '@/modules/inbox/services/inbox.service';
import type { InboxStatus, InboxThread } from '@/modules/inbox/types';
import { getUnits } from '@/modules/structure/services/units.service';
import { StatusBadge } from '@/components/feedback/StatusBadge';
import { getErrorMessage, isForbiddenError } from '@/services/errors';

const THREADS_PAGE_SIZE = 12;

function getThreadIdValue(id: unknown) {
  return String(id ?? '');
}

export function InboxPage() {
  const { instanceKey } = useTenantContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [pendingArchiveStatus, setPendingArchiveStatus] = useState<{
    threadId: string;
    status: InboxStatus;
  } | null>(null);

  const page = Number(searchParams.get('page') || '1');
  const status = (searchParams.get('status') || '') as InboxStatus | '';
  const unitId = searchParams.get('unitId') || '';
  const search = searchParams.get('search') || '';
  const threadIdFromUrl = searchParams.get('threadId') || '';

  const threadsQuery = useQuery({
    queryKey: ['inbox', instanceKey, { page, status, unitId, search }],
    queryFn: () =>
      getInboxThreads(instanceKey, {
        page,
        limit: THREADS_PAGE_SIZE,
        status: status || undefined,
        unitId: unitId || undefined,
        search: search || undefined,
      }),
    enabled: Boolean(instanceKey),
  });

  const unitsQuery = useQuery({
    queryKey: ['structure', 'units', instanceKey, 'inbox-filter'],
    queryFn: () => getUnits(instanceKey, { page: 1, limit: 200 }),
    enabled: Boolean(instanceKey),
  });

  const sendMessageMutation = useMutation({
    mutationFn: ({ threadId, message, attachmentIds }: { threadId: string; message: string; attachmentIds: string[] }) =>
      postInboxMessage(instanceKey, threadId, {
        message,
        attachmentIds,
      }),
    onSuccess: () => {
      setFeedbackMessage('Resposta enviada com sucesso.');
      queryClient.invalidateQueries({ queryKey: ['inbox', instanceKey] });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ threadId, status }: { threadId: string; status: InboxStatus }) =>
      updateInboxStatus(instanceKey, threadId, status),
    onSuccess: () => {
      setFeedbackMessage('Status atualizado com sucesso.');
      setPendingArchiveStatus(null);
      queryClient.invalidateQueries({ queryKey: ['inbox', instanceKey] });
    },
  });

  const threadsResponse = threadsQuery.data
    ?? emptyInboxThreadsResponse(THREADS_PAGE_SIZE);
  const selectedThreadId =
    threadIdFromUrl || getThreadIdValue(threadsResponse.data[0]?.id);
  const selectedThreadQuery = useQuery({
    queryKey: ['inbox', instanceKey, 'thread', selectedThreadId],
    queryFn: () =>
      getInboxThreads(instanceKey, {
        threadId: selectedThreadId,
        limit: 1,
      }),
    enabled: Boolean(instanceKey && selectedThreadId),
  });
  const selectedThreadFromQuery = useMemo<InboxThread | null>(() => {
    const thread = selectedThreadQuery.data?.selectedThread;
    if (!thread) {
      return null;
    }

    return getThreadIdValue(thread.id) === selectedThreadId ? thread : null;
  }, [selectedThreadId, selectedThreadQuery.data?.selectedThread]);

  const selectedThread = useMemo<InboxThread | null>(() => {
    if (selectedThreadFromQuery) {
      return selectedThreadFromQuery;
    }

    return threadsResponse.data.find((thread) => getThreadIdValue(thread.id) === selectedThreadId) ?? null;
  }, [selectedThreadFromQuery, selectedThreadId, threadsResponse.data]);

  const selectedMessages =
    selectedThreadFromQuery
      ? (
        selectedThreadQuery.data?.messages
        ?? selectedThreadFromQuery.messages
        ?? []
      )
      : (
        selectedThread?.messages
        ?? []
      );

  const handleThreadSelect = (thread: InboxThread) => {
    const nextThreadId = getThreadIdValue(thread.id);
    if (nextThreadId === selectedThreadId) {
      return;
    }

    setPendingArchiveStatus(null);

    setSearchParams((currentParams) => {
      const nextParams = new URLSearchParams(currentParams);
      nextParams.set('threadId', nextThreadId);
      return nextParams;
    });
  };

  const handleSelectFilter = (key: 'status' | 'unitId', value: string) => {
    setPendingArchiveStatus(null);
    setSearchParams((currentParams) => {
      const nextParams = new URLSearchParams(currentParams);

      if (value) {
        nextParams.set(key, value);
      } else {
        nextParams.delete(key);
      }

      nextParams.delete('threadId');
      nextParams.set('page', '1');
      return nextParams;
    });
  };

  const handlePageChange = (direction: 'previous' | 'next') => {
    setPendingArchiveStatus(null);
    setSearchParams((currentParams) => {
      const nextParams = new URLSearchParams(currentParams);
      const nextPage = direction === 'next' ? page + 1 : Math.max(page - 1, 1);
      nextParams.delete('threadId');
      nextParams.set('page', String(nextPage));
      return nextParams;
    });
  };

  const handleSendMessage = async (payload: { message: string; attachmentIds: string[] }) => {
    if (!selectedThread) {
      return;
    }

    await sendMessageMutation.mutateAsync({
      threadId: selectedThread.id,
      message: payload.message,
      attachmentIds: payload.attachmentIds,
    });
  };

  const handleStatusChange = async (nextStatus: InboxStatus) => {
    if (!selectedThread) {
      return;
    }

    if (nextStatus === 'ARQUIVADO' && selectedThread.status !== 'ARQUIVADO') {
      setPendingArchiveStatus({
        threadId: selectedThread.id,
        status: nextStatus,
      });
      return;
    }

    await statusMutation.mutateAsync({
      threadId: selectedThread.id,
      status: nextStatus,
    });
  };

  const handleConfirmArchive = async () => {
    if (!selectedThread || !pendingArchiveStatus || pendingArchiveStatus.threadId !== selectedThread.id) {
      return;
    }

    await statusMutation.mutateAsync({
      threadId: selectedThread.id,
      status: pendingArchiveStatus.status,
    });
  };

  if (threadsQuery.error && isForbiddenError(threadsQuery.error)) {
    return (
      <PermissionGuard allow={['SINDICO_ADMIN']}>
        <div className="page-stack">
          <PageHeader title="Atendimento" description="Gerencie os atendimentos privados por unidade." />
          <ErrorState
            title="Acesso negado ao inbox"
            description="O backend retornou 403 para este mÃ³dulo tenant."
            code="403"
          />
        </div>
      </PermissionGuard>
    );
  }

  if (threadsQuery.error) {
    return (
      <PermissionGuard allow={['SINDICO_ADMIN']}>
        <div className="page-stack">
          <PageHeader title="Atendimento" description="Gerencie os atendimentos privados por unidade." />
          <ErrorState
            title="Falha ao carregar threads"
            description={getErrorMessage(threadsQuery.error)}
          />
        </div>
      </PermissionGuard>
    );
  }

  const threadBadge = selectedThread ? getInboxStatusBadge(selectedThread.status) : null;

  return (
    <PermissionGuard allow={['SINDICO_ADMIN']}>
      <div className="page-stack">
        <PageHeader
          title="Atendimento"
          description="Acompanhe o inbox privado das unidades, responda mensagens e atualize o status do atendimento."
          badge={selectedThreadQuery.isFetching ? 'Atualizando thread' : undefined}
        />

        {feedbackMessage ? (
          <div className="inline-feedback inline-feedback--success">{feedbackMessage}</div>
        ) : null}

        <section className="panel-card">
          <div className="panel-card__header">
            <div>
              <h2>Threads por unidade</h2>
              <p>Filtros persistem na URL e a paginaÃ§Ã£o continua no backend.</p>
            </div>
          </div>

          <div className="panel-card__body">
            <FilterBar placeholder="Buscar por assunto, unidade ou mensagem..." />

            <div className="toolbar-row">
              <label className="field toolbar-row__field">
                <span className="field__label">Status</span>
                <select
                  className="field__input"
                  value={status}
                  onChange={(event) => handleSelectFilter('status', event.target.value)}
                >
                  <option value="">Todos</option>
                  <option value="ABERTO">Aberto</option>
                  <option value="EM_ATENDIMENTO">Em atendimento</option>
                  <option value="RESOLVIDO">Resolvido</option>
                  <option value="ARQUIVADO">Arquivado</option>
                </select>
              </label>

              <label className="field toolbar-row__field">
                <span className="field__label">Unidade</span>
                <select
                  className="field__input"
                  value={unitId}
                  onChange={(event) => handleSelectFilter('unitId', event.target.value)}
                >
                  <option value="">Todas</option>
                  {(unitsQuery.data?.data ?? []).map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.block?.name ? `${unit.block.name} - ${unit.number}` : unit.number}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="two-column-layout">
              <aside className="two-column-layout__sidebar">
                {threadsQuery.isPending ? (
                  <div className="table-loading">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div key={index} className="table-loading__row">
                        <div className="skeleton table-loading__line" />
                        <div className="skeleton table-loading__line table-loading__line--short" />
                      </div>
                    ))}
                  </div>
                ) : threadsResponse.data.length ? (
                  <>
                    <InboxThreadList
                      threads={threadsResponse.data}
                      selectedThreadId={selectedThreadId}
                      onSelect={handleThreadSelect}
                    />
                    <div className="list-pagination">
                      <button
                        type="button"
                        className="button button--ghost"
                        disabled={page <= 1}
                        onClick={() => handlePageChange('previous')}
                      >
                        Anterior
                      </button>
                      <span>
                        PÃ¡gina {threadsResponse.pagination.page} de {threadsResponse.pagination.totalPages}
                      </span>
                      <button
                        type="button"
                        className="button button--ghost"
                        disabled={page >= threadsResponse.pagination.totalPages}
                        onClick={() => handlePageChange('next')}
                      >
                        PrÃ³xima
                      </button>
                    </div>
                  </>
                ) : (
                  <EmptyState
                    title="Nenhuma thread encontrada"
                    description="Ajuste os filtros ou aguarde novas mensagens das unidades."
                  />
                )}
              </aside>

              <div className="two-column-layout__content" key={selectedThreadId || 'inbox-empty'}>
                {selectedThread ? (
                  <div className="page-stack">
                    <div className="detail-section">
                      <div className="detail-section__header">
                        <div>
                          <h3 className="detail-section__title">{getInboxThreadUnitLabel(selectedThread)}</h3>
                          <div className="detail-section__meta">
                            {threadBadge ? (
                              <StatusBadge status={threadBadge.status} label={threadBadge.label} />
                            ) : null}
                            <span className="detail-chip">
                              Atualizado em {formatInboxDateTime(selectedThread.updatedAt)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <InboxStatusControl
                        value={selectedThread.status}
                        onChange={(nextStatus) => {
                          void handleStatusChange(nextStatus);
                        }}
                        isSubmitting={statusMutation.isPending}
                      />
                    </div>

                    {selectedThreadQuery.isPending ? (
                      <div className="table-loading">
                        {Array.from({ length: 3 }).map((_, index) => (
                          <div key={index} className="table-loading__row">
                            <div className="skeleton table-loading__line" />
                            <div className="skeleton table-loading__line table-loading__line--short" />
                          </div>
                        ))}
                      </div>
                    ) : selectedMessages.length ? (
                      <InboxMessageList instanceKey={instanceKey} messages={selectedMessages} />
                    ) : (
                      <EmptyState
                        title="Thread sem mensagens carregadas"
                        description="Assim que houver histÃ³rico retornado pela API tenant, ele aparecerÃ¡ aqui."
                      />
                    )}

                    <InboxComposer
                      instanceKey={instanceKey}
                      onSend={handleSendMessage}
                      isSubmitting={sendMessageMutation.isPending}
                    />
                  </div>
                ) : (
                  <EmptyState
                    title="Nenhuma thread selecionada"
                    description="Escolha uma unidade na coluna lateral para abrir o histÃ³rico privado."
                  />
                )}
              </div>
            </div>
          </div>
        </section>

        <ConfirmActionModal
          isOpen={Boolean(pendingArchiveStatus && pendingArchiveStatus.threadId === selectedThread?.id)}
          title="Arquivar atendimento"
          description="Tem certeza de que deseja arquivar esta thread de atendimento?"
          confirmLabel="Arquivar"
          isLoading={statusMutation.isPending}
          onConfirm={handleConfirmArchive}
          onCancel={() => setPendingArchiveStatus(null)}
        />
      </div>
    </PermissionGuard>
  );
}
