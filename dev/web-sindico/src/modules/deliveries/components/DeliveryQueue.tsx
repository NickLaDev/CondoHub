import { StatusBadge } from '@/components/feedback/StatusBadge';
import { EmptyState } from '@/components/states/EmptyState';
import { ErrorState } from '@/components/states/ErrorState';
import { formatDeliveryDateTime, getDeliveryStatusBadge } from '@/modules/deliveries/helpers';
import type { DeliverySummary } from '@/modules/deliveries/types';
import { getErrorMessage, isForbiddenError } from '@/services/errors';

interface DeliveryQueueProps {
  deliveries: DeliverySummary[];
  isLoading?: boolean;
  error?: unknown;
  unavailable?: boolean;
  onSelect: (delivery: DeliverySummary) => void;
}

export function DeliveryQueue({
  deliveries,
  isLoading = false,
  error,
  unavailable = false,
  onSelect,
}: DeliveryQueueProps) {
  if (isLoading) {
    return <div>Carregando fila operacional...</div>;
  }

  if (error) {
    return (
      <ErrorState
        title={isForbiddenError(error) ? 'Fila sem permissao' : 'Falha ao carregar fila'}
        description={getErrorMessage(error)}
        code={isForbiddenError(error) ? '403' : undefined}
      />
    );
  }

  if (unavailable) {
    return (
      <EmptyState
        title="Fila ainda nao disponivel"
        description="O endpoint operacional de fila ainda nao esta exposto para esta instancia."
      />
    );
  }

  if (deliveries.length === 0) {
    return (
      <EmptyState
        title="Fila operacional vazia"
        description="Nenhuma entrega aguardando distribuicao neste momento."
      />
    );
  }

  return (
    <div className="thread-list">
      {deliveries.map((delivery) => {
        const badge = getDeliveryStatusBadge(delivery.status);

        return (
          <button
            key={delivery.id}
            type="button"
            className="thread-list__item"
            onClick={() => onSelect(delivery)}
          >
            <div className="thread-list__item-header">
              <strong>{delivery.code}</strong>
              <StatusBadge status={badge.status} label={badge.label} />
            </div>
            <p>{delivery.recipientName}</p>
            <span>{delivery.unitLabel ?? 'Unidade nao informada'}</span>
            <span>{formatDeliveryDateTime(delivery.updatedAt ?? delivery.createdAt)}</span>
          </button>
        );
      })}
    </div>
  );
}
