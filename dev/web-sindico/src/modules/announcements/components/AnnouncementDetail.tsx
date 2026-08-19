import { Clock } from 'lucide-react';
import { AttachmentLinks } from '@/components/attachments/AttachmentLinks';
import { StatusBadge } from '@/components/feedback/StatusBadge';
import type { Announcement } from '@/modules/announcements/types';

interface AnnouncementDetailProps {
  instanceKey: string;
  announcement: Announcement;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function isArchived(announcement: Announcement) {
  return Boolean(announcement.archived || announcement.archivedAt);
}

export function AnnouncementDetail({ instanceKey, announcement }: AnnouncementDetailProps) {
  const totalAckRequired = announcement.totalAckRequired ?? announcement.acknowledgements?.length;
  const acknowledgementCount = announcement.ackCount ?? announcement.acknowledgements?.length ?? 0;

  return (
    <div className="page-stack">
      <div className="detail-section">
        <div className="detail-section__header">
          <div>
            <h3 className="detail-section__title">{announcement.title}</h3>
            <div className="detail-section__meta">
              <StatusBadge status={isArchived(announcement) ? 'archived' : 'active'} />
              <StatusBadge
                status={announcement.requireAck ? 'info' : 'neutral'}
                label={announcement.requireAck ? 'Requer confirmação' : 'Sem confirmação'}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="detail-section">
        <p className="detail-section__body">{announcement.body}</p>
      </div>

      <div className="detail-section detail-section__meta-row">
        <span className="detail-chip">
          <Clock size={14} />
          Criado em {formatDateTime(announcement.createdAt)}
        </span>
        <span className="detail-chip">Atualizado em {formatDateTime(announcement.updatedAt)}</span>
      </div>

      {announcement.requireAck ? (
        <div className="detail-section">
          <h4 className="detail-section__subtitle">Confirmações</h4>
          <p className="detail-section__body">
            {totalAckRequired
              ? `${acknowledgementCount} de ${totalAckRequired} confirmações registradas.`
              : `${acknowledgementCount} confirmações registradas até agora.`}
          </p>

          {announcement.acknowledgements?.length ? (
            <div className="detail-list">
              {announcement.acknowledgements.map((acknowledgement) => (
                <div key={acknowledgement.id} className="detail-list__item">
                  <strong>{acknowledgement.unitLabel ?? acknowledgement.userName ?? 'Confirmação registrada'}</strong>
                  <span>{formatDateTime(acknowledgement.ackAt)}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {announcement.attachmentIds?.length ? (
        <div className="detail-section">
          <h4 className="detail-section__subtitle">Anexos</h4>
          <AttachmentLinks instanceKey={instanceKey} attachmentIds={announcement.attachmentIds} />
        </div>
      ) : null}
    </div>
  );
}
