import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTenantContext } from '@/app/tenant/tenantContext';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable } from '@/components/data/DataTable';
import { DrawerDetail } from '@/components/drawer/DrawerDetail';
import { StatusBadge } from '@/components/feedback/StatusBadge';
import { FilterBar } from '@/components/filters/FilterBar';
import { ConfirmActionModal } from '@/components/modals/ConfirmActionModal';
import { FormModal } from '@/components/modals/FormModal';
import { EmptyState } from '@/components/states/EmptyState';
import { ErrorState } from '@/components/states/ErrorState';
import { DeliveryAssignControl } from '@/modules/deliveries/components/DeliveryAssignControl';
import { DeliveryCompleteControl } from '@/modules/deliveries/components/DeliveryCompleteControl';
import { DeliveryDetail } from '@/modules/deliveries/components/DeliveryDetail';
import { DeliveryFailControl } from '@/modules/deliveries/components/DeliveryFailControl';
import { DeliveryForm } from '@/modules/deliveries/components/DeliveryForm';
import { DeliveryQueue } from '@/modules/deliveries/components/DeliveryQueue';
import { formatDeliveryDateTime, getDeliveryStatusBadge } from '@/modules/deliveries/helpers';
import {
  assignDelivery,
  completeDelivery,
  createDelivery,
  emptyDeliveriesResponse,
  failDelivery,
  getDeliveries,
  getDeliveryById,
  getDeliveryQueue,
} from '@/modules/deliveries/services/deliveries.service';
import type {
  CreateDeliveryRequest,
  DeliverySummary,
  FailDeliveryRequest,
} from '@/modules/deliveries/types';
import { getUnits } from '@/modules/structure/services/units.service';
import { getStaff } from '@/modules/users/services/staff.service';
import { getErrorMessage, isForbiddenError } from '@/services/errors';

const PAGE_SIZE = 12;

export function DeliveriesPage() {
  const { instanceKey } = useTenantContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [pendingFailPayload, setPendingFailPayload] = useState<FailDeliveryRequest | null>(null);

  const page = Number(searchParams.get('page') || '1');
  const status = searchParams.get('status') || '';
  const search = searchParams.get('search') || '';
  const selectedDeliveryId = searchParams.get('deliveryId') || '';

  useEffect(() => {
    setIsCreateModalOpen(false);
    setFeedbackMessage(null);
    setPendingFailPayload(null);
  }, [instanceKey]);

  const deliveriesQuery = useQuery({
    queryKey: ['deliveries', instanceKey, { page, status, search }],
    queryFn: () =>
      getDeliveries(instanceKey, {
        page,
        limit: PAGE_SIZE,
        status: status || undefined,
        search: search || undefined,
      }),
    enabled: Boolean(instanceKey),
    placeholderData: keepPreviousData,
  });

  const queueQuery = useQuery({
    queryKey: ['deliveries', instanceKey, 'queue'],
    queryFn: () => getDeliveryQueue(instanceKey),
    enabled: Boolean(instanceKey),
  });

  const detailQuery = useQuery({
    queryKey: ['deliveries', instanceKey, 'detail', selectedDeliveryId],
    queryFn: () => getDeliveryById(instanceKey, selectedDeliveryId),
    enabled: Boolean(instanceKey && selectedDeliveryId),
  });

  const unitsQuery = useQuery({
    queryKey: ['deliveries', instanceKey, 'units'],
    queryFn: () => getUnits(instanceKey, { page: 1, limit: 200 }),
    enabled: Boolean(instanceKey),
  });

  const couriersQuery = useQuery({
    queryKey: ['deliveries', instanceKey, 'couriers'],
    queryFn: () =>
      getStaff(instanceKey, {
        page: 1,
        limit: 200,
        role: 'FUNC_ENTREGAS',
        status: 'active',
      }),
    enabled: Boolean(instanceKey),
  });

  const createMutation = useMutation({
    mutationFn: (createDeliveryData: CreateDeliveryRequest) =>
      createDelivery(instanceKey, createDeliveryData),
    onSuccess: () => {
      setFeedbackMessage('Chegada registrada com sucesso.');
      setIsCreateModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['deliveries', instanceKey] });
    },
  });

  const assignMutation = useMutation({
    mutationFn: ({ deliveryId, userId }: { deliveryId: string; userId: string }) =>
      assignDelivery(instanceKey, deliveryId, { userId }),
    onSuccess: () => {
      setFeedbackMessage('Entrega atribuida com sucesso.');
      queryClient.invalidateQueries({ queryKey: ['deliveries', instanceKey] });
    },
  });

  const completeMutation = useMutation({
    mutationFn: ({ deliveryId, payload }: { deliveryId: string; payload: Parameters<typeof completeDelivery>[2] }) =>
      completeDelivery(instanceKey, deliveryId, payload),
    onSuccess: () => {
      setFeedbackMessage('Entrega concluida com sucesso.');
      queryClient.invalidateQueries({ queryKey: ['deliveries', instanceKey] });
    },
  });

  const failMutation = useMutation({
    mutationFn: ({ deliveryId, payload }: { deliveryId: string; payload: FailDeliveryRequest }) =>
      failDelivery(instanceKey, deliveryId, payload),
    onSuccess: () => {
      setFeedbackMessage('Falha registrada com sucesso.');
      setPendingFailPayload(null);
      queryClient.invalidateQueries({ queryKey: ['deliveries', instanceKey] });
    },
  });

  const deliveryRows = deliveriesQuery.data ?? emptyDeliveriesResponse(PAGE_SIZE);

  const statusOptions = ['CHEGOU', 'EM_DISTRIBUICAO', 'ENTREGUE', 'NAO_ENTREGUE'];

  const columns = [
    {
      key: 'code',
      header: 'Codigo',
      render: (value: string, item: DeliverySummary) => (
        <div className="table-cell-stack">
          <strong>{value}</strong>
          <span>{formatDeliveryDateTime(item.createdAt)}</span>
        </div>
      ),
    },
    {
      key: 'recipientName',
      header: 'Destinatario',
    },
    {
      key: 'unitLabel',
      header: 'Unidade',
      render: (value: string | null) => value ?? 'Nao informada',
    },
    {
      key: 'courierName',
      header: 'Entregador',
      render: (value: string | null) => value ?? 'Nao atribuido',
    },
    {
      key: 'status',
      header: 'Status',
      render: (value: string) => {
        const badge = getDeliveryStatusBadge(value);
        return <StatusBadge status={badge.status} label={badge.label} />;
      },
    },
  ];

  const selectedDelivery = detailQuery.data?.delivery ?? null;
  const courierOptions = useMemo(
    () => (couriersQuery.data?.data ?? []).map((staff) => ({ id: staff.id, name: staff.name })),
    [couriersQuery.data?.data],
  );

  const handleFilterUpdate = (key: string, value: string) => {
    const nextParams = new URLSearchParams(searchParams);

    if (value) {
      nextParams.set(key, value);
    } else {
      nextParams.delete(key);
    }

    nextParams.set('page', '1');
    setSearchParams(nextParams);
  };

  const handleOpenDetail = (delivery: DeliverySummary) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('deliveryId', delivery.id);
    setSearchParams(nextParams);
  };

  const handlePageChange = (nextPage: number) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('page', String(nextPage));
    setSearchParams(nextParams);
  };

  if (deliveriesQuery.error && isForbiddenError(deliveriesQuery.error)) {
    return (
      <PermissionGuard allow={['SINDICO_ADMIN', 'FUNC_ENTREGAS']}>
        <div className="page-stack">
          <PageHeader title="Encomendas" description="Controle a operacao de entregas do condominio." />
          <ErrorState
            title="Acesso negado as entregas"
            description="O backend retornou 403 para esta listagem tenant."
            code="403"
          />
        </div>
      </PermissionGuard>
    );
  }

  if (deliveriesQuery.error) {
    return (
      <PermissionGuard allow={['SINDICO_ADMIN', 'FUNC_ENTREGAS']}>
        <div className="page-stack">
          <PageHeader title="Encomendas" description="Controle a operacao de entregas do condominio." />
          <ErrorState
            title="Falha ao carregar entregas"
            description={getErrorMessage(deliveriesQuery.error)}
          />
        </div>
      </PermissionGuard>
    );
  }

  return (
    <PermissionGuard allow={['SINDICO_ADMIN', 'FUNC_ENTREGAS']}>
      <div className="page-stack">
        <PageHeader
          title="Encomendas"
          description="Registre chegada, destaque a fila operacional e acompanhe conclusoes ou falhas."
          badge={deliveriesQuery.isFetching ? 'Atualizando operacao' : undefined}
          actions={
            <button
              type="button"
              className="button button--add"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <Plus size={16} /> Registrar chegada
            </button>
          }
        />

        {feedbackMessage ? (
          <div className="inline-feedback inline-feedback--success">{feedbackMessage}</div>
        ) : null}

        <section className="panel-card">
          <div className="panel-card__header">
            <div>
              <h2>Fila operacional</h2>
              <p>Integra o endpoint de fila quando ele estiver disponivel para a instancia.</p>
            </div>
          </div>
          <div className="panel-card__body">
            <DeliveryQueue
              deliveries={queueQuery.data?.data ?? []}
              isLoading={queueQuery.isLoading}
              error={queueQuery.error}
              unavailable={queueQuery.data?.unavailable}
              onSelect={handleOpenDetail}
            />
          </div>
        </section>

        <section className="panel-card">
          <div className="panel-card__header">
            <div>
              <h2>Listagem de entregas</h2>
              <p>Busca por codigo ou destinatario com paginacao server-side.</p>
            </div>
          </div>
          <div className="panel-card__body page-stack">
            <FilterBar placeholder="Buscar por codigo ou destinatario..." />

            <div className="toolbar-row">
              <label className="field toolbar-row__field">
                <span className="field__label">Status</span>
                <select
                  className="field__input"
                  value={status}
                  onChange={(event) => handleFilterUpdate('status', event.target.value)}
                >
                  <option value="">Todos</option>
                  {statusOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <DataTable
              columns={columns}
              data={deliveryRows.data}
              loading={deliveriesQuery.isLoading}
              emptyMessage="Nenhuma entrega encontrada para os filtros atuais."
              pagination={{
                currentPage: deliveryRows.pagination.page,
                totalPages: deliveryRows.pagination.totalPages,
                totalItems: deliveryRows.pagination.total,
                onPageChange: handlePageChange,
              }}
              actions={(item) => (
                <button
                  type="button"
                  className="table-link"
                  onClick={() => handleOpenDetail(item)}
                >
                  Ver detalhe
                </button>
              )}
            />

            {!deliveriesQuery.isLoading && deliveryRows.data.length === 0 ? (
              <EmptyState
                title="Nenhuma entrega encontrada"
                description="Registre uma nova chegada ou ajuste os filtros atuais."
                action={
                  <button
                    type="button"
                    className="button button--add"
                    onClick={() => setIsCreateModalOpen(true)}
                  >
                    Registrar chegada
                  </button>
                }
              />
            ) : null}
          </div>
        </section>

        <FormModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Registrar chegada"
        >
          <DeliveryForm
            instanceKey={instanceKey}
            units={unitsQuery.data?.data ?? []}
            onSubmit={async (payload) => {
              await createMutation.mutateAsync(payload);
            }}
            onCancel={() => setIsCreateModalOpen(false)}
            isSubmitting={createMutation.isPending}
            error={createMutation.error}
          />
        </FormModal>

        <DrawerDetail
          isOpen={Boolean(selectedDeliveryId)}
          onClose={() => {
            const nextParams = new URLSearchParams(searchParams);
            nextParams.delete('deliveryId');
            setSearchParams(nextParams);
          }}
          title={selectedDelivery?.code ?? 'Detalhe da entrega'}
          description="Visualize o fluxo operacional, distribuicao, conclusao e falha."
        >
          {detailQuery.isLoading ? (
            <div>Carregando detalhe da entrega...</div>
          ) : detailQuery.error ? (
            <ErrorState
              title="Falha ao carregar detalhe"
              description={getErrorMessage(detailQuery.error)}
            />
          ) : detailQuery.data ? (
            <div className="page-stack">
              <DeliveryDetail instanceKey={instanceKey} detail={detailQuery.data} />

              {selectedDelivery ? (
                <>
                  <DeliveryAssignControl
                    couriers={courierOptions}
                    currentCourierId={selectedDelivery.courierUserId}
                    onAssign={async (userId) => {
                      await assignMutation.mutateAsync({ deliveryId: selectedDelivery.id, userId });
                    }}
                    isSubmitting={assignMutation.isPending}
                  />

                  <DeliveryCompleteControl
                    instanceKey={instanceKey}
                    onSubmit={async (payload) => {
                      await completeMutation.mutateAsync({
                        deliveryId: selectedDelivery.id,
                        payload,
                      });
                    }}
                    isSubmitting={completeMutation.isPending}
                  />

                  <DeliveryFailControl
                    instanceKey={instanceKey}
                    onSubmit={setPendingFailPayload}
                    isSubmitting={failMutation.isPending}
                  />
                </>
              ) : null}
            </div>
          ) : (
            <EmptyState
              title="Nenhuma entrega selecionada"
              description="Selecione uma entrega na lista ou na fila operacional."
            />
          )}
        </DrawerDetail>

        <ConfirmActionModal
          isOpen={Boolean(pendingFailPayload)}
          title="Confirmar falha"
          description={pendingFailPayload
            ? `Voce esta prestes a registrar falha com o motivo: "${pendingFailPayload.reason}".`
            : 'Confirme a falha operacional desta entrega.'}
          confirmLabel="Registrar falha"
          onConfirm={() => {
            if (!selectedDelivery || !pendingFailPayload) {
              return;
            }

            void failMutation.mutateAsync({
              deliveryId: selectedDelivery.id,
              payload: pendingFailPayload,
            });
          }}
          onCancel={() => setPendingFailPayload(null)}
          isLoading={failMutation.isPending}
        />
      </div>
    </PermissionGuard>
  );
}
