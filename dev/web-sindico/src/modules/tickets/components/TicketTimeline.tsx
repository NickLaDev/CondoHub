import { AttachmentLinks } from '@/components/attachments/AttachmentLinks';
import { StatusBadge } from '@/components/feedback/StatusBadge';
import {
  formatTicketDateTime,
  getTicketStatusBadge,
} from '@/modules/tickets/helpers';
import type { TicketTimelineItem } from '@/modules/tickets/types';

interface TicketTimelineProps {
  instanceKey: string;
  items: TicketTimelineItem[];
}

export function TicketTimeline({ instanceKey, items }: TicketTimelineProps) {
  if (items.length === 0) {
    return (
      <div className="table-empty">
        Nenhum evento de timeline retornado para este ticket.
      </div>
    );
  }

  return (
    <div className="timeline-list">
      {items.map((item) => {
        const statusBadge = item.toStatus ? getTicketStatusBadge(item.toStatus) : null;

        return (
          <article key={item.id} className="timeline-item">
            <div className="timeline-item__meta">
              <strong>{item.type === 'STATUS' ? 'Mudanca de status' : 'Mensagem'}</strong>
              <span>{formatTicketDateTime(item.createdAt)}</span>
            </div>

            <div className="timeline-item__body">
              {item.actorName ? <p>Por: {item.actorName}</p> : null}
              {item.type === 'STATUS' ? (
                <div className="timeline-item__status">
                  {item.fromStatus ? (
                    <StatusBadge
                      status={getTicketStatusBadge(item.fromStatus).status}
                      label={getTicketStatusBadge(item.fromStatus).label}
                    />
                  ) : null}
                  {statusBadge ? (
                    <StatusBadge status={statusBadge.status} label={statusBadge.label} />
                  ) : null}
                </div>
              ) : null}
              <p>{item.description}</p>
              {item.attachmentIds?.length ? (
                <AttachmentLinks
                  instanceKey={instanceKey}
                  attachmentIds={item.attachmentIds}
                />
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}
