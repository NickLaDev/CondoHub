import { Link } from 'react-router-dom';
import {
  formatDashboardDateTime,
  formatDashboardLogAction,
  formatDashboardLogType,
} from '@/modules/dashboard/helpers';
import type { DashboardLogEntry } from '@/modules/dashboard/types';

interface RecentLogsPanelProps {
  logs: DashboardLogEntry[];
  linkTo: string;
}

export function RecentLogsPanel({ logs, linkTo }: RecentLogsPanelProps) {
  return (
    <section className="panel-card dashboard-panel dashboard-panel--full">
      <div className="panel-card__header dashboard-panel__header">
        <div>
          <h2>Ultimos Logs de Auditoria</h2>
        </div>

        <Link className="dashboard-panel__link" to={linkTo}>
          Ver todos -&gt;
        </Link>
      </div>

      {logs.length === 0 ? (
        <div className="table-empty">Sem registros recentes retornados para a instancia.</div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table dashboard-table">
            <thead>
              <tr>
                <th>Acao</th>
                <th>Tipo</th>
                <th>Usuario</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((entry) => (
                <tr key={entry.id}>
                  <td className="dashboard-table__title">
                    <strong>{formatDashboardLogAction(entry.action)}</strong>
                  </td>
                  <td>{formatDashboardLogType(entry.entity)}</td>
                  <td>{entry.actorName ?? 'Sistema'}</td>
                  <td className="dashboard-table__muted">
                    {formatDashboardDateTime(entry.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
