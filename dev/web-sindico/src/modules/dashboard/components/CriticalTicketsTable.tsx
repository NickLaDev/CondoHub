import { Link } from 'react-router-dom';
import { StatusBadge } from '@/components/feedback/StatusBadge';
import {
  formatDashboardTicketCode,
  formatDashboardUnitLabel,
  getDashboardTicketPriorityBadge,
  getDashboardTicketStatusBadge,
} from '@/modules/dashboard/helpers';
import type { DashboardTicket } from '@/modules/dashboard/types';

interface CriticalTicketsTableProps {
  tickets: DashboardTicket[];
  linkTo: string;
}

export function CriticalTicketsTable({
  tickets,
  linkTo,
}: CriticalTicketsTableProps) {
  return (
    <section className="panel-card dashboard-panel">
      <div className="panel-card__header dashboard-panel__header">
        <div>
          <h2>Tickets Criticos</h2>
        </div>

        <Link className="dashboard-panel__link" to={linkTo}>
          Ver todos -&gt;
        </Link>
      </div>

      {tickets.length === 0 ? (
        <div className="table-empty">Nenhum ticket critico em aberto para esta instancia.</div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table dashboard-table">
            <thead>
              <tr>
                <th>Codigo</th>
                <th>Titulo</th>
                <th>Unidade</th>
                <th>Prioridade</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => {
                const priorityBadge = getDashboardTicketPriorityBadge(ticket.priority);
                const statusBadge = getDashboardTicketStatusBadge(ticket.status);

                return (
                  <tr key={ticket.id}>
                    <td className="dashboard-table__code">{formatDashboardTicketCode(ticket.id)}</td>
                    <td className="dashboard-table__title">
                      <strong>{ticket.title}</strong>
                    </td>
                    <td>{formatDashboardUnitLabel(ticket.unitLabel)}</td>
                    <td>
                      <StatusBadge
                        status={priorityBadge.status}
                        label={priorityBadge.label}
                      />
                    </td>
                    <td>
                      <StatusBadge
                        status={statusBadge.status}
                        label={statusBadge.label}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
