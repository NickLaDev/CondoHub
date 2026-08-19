import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useTenantContext } from '@/app/tenant/tenantContext';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/states/EmptyState';
import { ErrorState } from '@/components/states/ErrorState';
import { TurnHistory } from '@/modules/turns/components/TurnHistory';
import { TurnStatusCard } from '@/modules/turns/components/TurnStatusCard';
import { endTurn, getTurnsSnapshot, startTurn } from '@/modules/turns/services/turns.service';
import type { TurnSnapshot } from '@/modules/turns/types';
import { getErrorMessage, isForbiddenError, getHttpStatus } from '@/services/errors';

const EMPTY_SNAPSHOT: TurnSnapshot = {
  currentTurn: null,
  history: [],
  queueDeliveries: [],
};

export function TurnsPage() {
  const { instanceKey } = useTenantContext();
  const queryClient = useQueryClient();
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  useEffect(() => {
    setFeedbackMessage(null);
  }, [instanceKey]);

  const snapshotQuery = useQuery({
    queryKey: ['turns', instanceKey, 'snapshot'],
    queryFn: () => getTurnsSnapshot(instanceKey),
    enabled: Boolean(instanceKey),
  });

  const startMutation = useMutation({
    mutationFn: () => startTurn(instanceKey),
    onSuccess: (snapshot) => {
      setFeedbackMessage('Turno iniciado com sucesso.');
      queryClient.setQueryData(['turns', instanceKey, 'snapshot'], snapshot);
      queryClient.invalidateQueries({ queryKey: ['deliveries', instanceKey] });
    },
    onError: (error) => {
      const status = getHttpStatus(error);
      if (status === 403) {
        setFeedbackMessage('Sem permissao para iniciar turno. Esta acao requer perfil de entregador.');
      } else if (status === 409) {
        setFeedbackMessage('Ja existe um turno aberto. Encerre o turno atual antes de iniciar um novo.');
      } else {
        setFeedbackMessage(getErrorMessage(error, 'Nao foi possivel iniciar o turno.'));
      }
    },
  });

  const endMutation = useMutation({
    mutationFn: () => endTurn(instanceKey),
    onSuccess: (snapshot) => {
      setFeedbackMessage('Turno encerrado com sucesso.');
      queryClient.setQueryData(['turns', instanceKey, 'snapshot'], snapshot);
      queryClient.invalidateQueries({ queryKey: ['deliveries', instanceKey] });
    },
    onError: (error) => {
      const status = getHttpStatus(error);
      if (status === 403) {
        setFeedbackMessage('Sem permissao para encerrar turno. Esta acao requer perfil de entregador.');
      } else if (status === 404) {
        setFeedbackMessage('Nenhum turno aberto encontrado para encerrar.');
      } else {
        setFeedbackMessage(getErrorMessage(error, 'Nao foi possivel encerrar o turno.'));
      }
    },
  });

  const snapshot = useMemo(
    () => snapshotQuery.data ?? EMPTY_SNAPSHOT,
    [snapshotQuery.data],
  );

  if (snapshotQuery.error && isForbiddenError(snapshotQuery.error)) {
    return (
      <PermissionGuard allow={['SINDICO_ADMIN', 'FUNC_ENTREGAS']}>
        <div className="page-stack">
          <PageHeader title="Turnos" description="Controle a jornada operacional de entregas." />
          <ErrorState
            title="Acesso negado aos turnos"
            description="O backend retornou 403 para este modulo tenant."
            code="403"
          />
        </div>
      </PermissionGuard>
    );
  }

  if (snapshotQuery.error) {
    return (
      <PermissionGuard allow={['SINDICO_ADMIN', 'FUNC_ENTREGAS']}>
        <div className="page-stack">
          <PageHeader title="Turnos" description="Controle a jornada operacional de entregas." />
          <ErrorState
            title="Falha ao carregar turnos"
            description={getErrorMessage(snapshotQuery.error)}
          />
        </div>
      </PermissionGuard>
    );
  }

  return (
    <PermissionGuard allow={['SINDICO_ADMIN', 'FUNC_ENTREGAS']}>
      <div className="page-stack">
        <PageHeader
          title="Turnos"
          description="Visualize o estado do turno atual, relacione com a fila e atue sobre inicio ou encerramento."
          badge={snapshotQuery.isFetching ? 'Atualizando estado' : undefined}
        />

        {feedbackMessage ? (
          <div className="inline-feedback inline-feedback--success">{feedbackMessage}</div>
        ) : null}

        <TurnStatusCard
          snapshot={snapshot}
          onStart={async () => {
            await startMutation.mutateAsync();
          }}
          onEnd={async () => {
            await endMutation.mutateAsync();
          }}
          isStarting={startMutation.isPending}
          isEnding={endMutation.isPending}
        />

        <section className="panel-card">
          <div className="panel-card__header">
            <div>
              <h2>Fila relacionada</h2>
              <p>Entregas atualmente vinculadas ao estado operacional do turno.</p>
            </div>
          </div>
          <div className="panel-card__body">
            {snapshot.queueDeliveries.length === 0 ? (
              <EmptyState
                title="Sem fila vinculada"
                description="Nenhuma entrega retornou na relacao atual com a fila operacional."
              />
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Codigo</th>
                      <th>Destinatario</th>
                      <th>Unidade</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.queueDeliveries.map((delivery) => (
                      <tr key={delivery.id}>
                        <td>{delivery.code}</td>
                        <td>{delivery.recipientName}</td>
                        <td>{delivery.unitLabel ?? 'Nao informada'}</td>
                        <td>{delivery.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <section className="panel-card">
          <div className="panel-card__header">
            <div>
              <h2>Historico resumido</h2>
              <p>Se o backend nao trouxer historico, a tela degrada com foco no estado atual.</p>
            </div>
          </div>
          <div className="panel-card__body">
            <TurnHistory history={snapshot.history} />
          </div>
        </section>
      </div>
    </PermissionGuard>
  );
}
