import { AttachmentLinks } from '@/components/attachments/AttachmentLinks';
import { StatusBadge } from '@/components/feedback/StatusBadge';
import { formatDeliveryDateTime, getDeliveryStatusBadge } from '@/modules/deliveries/helpers';
import type { DeliveryDetailResponse } from '@/modules/deliveries/types';

interface DeliveryDetailProps {
  instanceKey: string;
  detail: DeliveryDetailResponse;
}

export function DeliveryDetail({ instanceKey, detail }: DeliveryDetailProps) {
  const delivery = detail.delivery;

  if (!delivery) {
    return (
      <div className="table-empty">
        O backend nao retornou o detalhe desta entrega.
      </div>
    );
  }

  const statusBadge = getDeliveryStatusBadge(delivery.status);

  return (
    <div className="page-stack">
      <section className="detail-section">
        <div className="thread-list__item-header">
          <div>
            <h3 className="detail-section__title">{delivery.code}</h3>
            <p className="detail-section__body">{delivery.recipientName}</p>
          </div>
          <StatusBadge status={statusBadge.status} label={statusBadge.label} />
        </div>

        <div className="detail-list">
          <div className="detail-list__item">
            <strong>Unidade</strong>
            <span>{delivery.unitLabel ?? 'Nao informada'}</span>
          </div>
          <div className="detail-list__item">
            <strong>Entregador</strong>
            <span>{delivery.courierName ?? 'Nao atribuido'}</span>
          </div>
          <div className="detail-list__item">
            <strong>Criado em</strong>
            <span>{formatDeliveryDateTime(delivery.createdAt)}</span>
          </div>
          <div className="detail-list__item">
            <strong>Atualizado em</strong>
            <span>{formatDeliveryDateTime(delivery.updatedAt)}</span>
          </div>
          {delivery.deliveredToName ? (
            <div className="detail-list__item">
              <strong>Recebido por</strong>
              <span>{delivery.deliveredToName}</span>
            </div>
          ) : null}
          {delivery.failureReason ? (
            <div className="detail-list__item">
              <strong>Motivo da falha</strong>
              <span>{delivery.failureReason}</span>
            </div>
          ) : null}
        </div>

        {delivery.attachmentIds.length > 0 ? (
          <AttachmentLinks
            instanceKey={instanceKey}
            attachmentIds={delivery.attachmentIds}
          />
        ) : null}
      </section>

      <section className="detail-section">
        <h3 className="detail-section__title">Eventos da entrega</h3>
        {detail.events.length === 0 ? (
          <div className="table-empty">
            Nenhum evento operacional retornado para esta entrega.
          </div>
        ) : (
          <div className="timeline-list">
            {detail.events.map((event) => (
              <article key={event.id} className="timeline-item">
                <div className="timeline-item__meta">
                  <strong>{event.type}</strong>
                  <span>{formatDeliveryDateTime(event.createdAt)}</span>
                </div>
                <div className="timeline-item__body">
                  {event.actorName ? <p>Por: {event.actorName}</p> : null}
                  <p>{event.description}</p>
                  {event.attachmentIds.length > 0 ? (
                    <AttachmentLinks
                      instanceKey={instanceKey}
                      attachmentIds={event.attachmentIds}
                    />
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
