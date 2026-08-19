import { formatLogDateTime } from '@/modules/logs/utils';
import type { InstanceLogEntry } from '@/modules/logs/types';

interface LogDetailProps {
  log: InstanceLogEntry;
}

function formatJson(value: unknown) {
  if (value == null) {
    return null;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function LogDetail({ log }: LogDetailProps) {
  const detailsJson = formatJson(log.detailsJson);

  return (
    <div className="page-stack">
      <section className="detail-section">
        <h3 className="detail-section__title">Resumo</h3>
        <div className="detail-list">
          <div className="detail-list__item">
            <strong>Data/Hora</strong>
            <span>{formatLogDateTime(log.createdAt)}</span>
          </div>
          <div className="detail-list__item">
            <strong>Ator</strong>
            <span>{log.actorName ?? 'Sistema'}</span>
          </div>
          <div className="detail-list__item">
            <strong>Acao</strong>
            <span>{log.action}</span>
          </div>
          <div className="detail-list__item">
            <strong>Entidade</strong>
            <span>{log.entity ?? '-'}</span>
          </div>
          <div className="detail-list__item">
            <strong>Request ID</strong>
            <span>{log.requestId ?? '-'}</span>
          </div>
          <div className="detail-list__item">
            <strong>IP</strong>
            <span>{log.ip ?? '-'}</span>
          </div>
          <div className="detail-list__item">
            <strong>User Agent</strong>
            <span>{log.userAgent ?? '-'}</span>
          </div>
          <div className="detail-list__item">
            <strong>Contexto</strong>
            <span>{log.context ?? '-'}</span>
          </div>
        </div>
      </section>

      {detailsJson ? (
        <section className="detail-section">
          <h3 className="detail-section__title">details_json</h3>
          <pre className="json-panel">{detailsJson}</pre>
        </section>
      ) : null}
    </div>
  );
}
