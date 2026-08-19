import { Link } from 'react-router-dom';
import { StatusBadge } from '@/components/feedback/StatusBadge';
import {
  formatDashboardUnitLabel,
  getDashboardDeliveryStatusBadge,
} from '@/modules/dashboard/helpers';
import type { DashboardDelivery } from '@/modules/dashboard/types';

interface DistributionDeliveriesTableProps {
  deliveries: DashboardDelivery[];
  linkTo: string;
}

export function DistributionDeliveriesTable({
  deliveries,
  linkTo,
}: DistributionDeliveriesTableProps) {
  return (
    <section className="panel-card dashboard-panel">
      <div className="panel-card__header dashboard-panel__header">
        <div>
          <h2>Encomendas em Distribuicao</h2>
        </div>

        <Link className="dashboard-panel__link" to={linkTo}>
          Ver todas -&gt;
        </Link>
      </div>

      {deliveries.length === 0 ? (
        <div className="table-empty">Nenhuma encomenda em distribuicao neste momento.</div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table dashboard-table">
            <thead>
              <tr>
                <th>Codigo</th>
                <th>Destinatario</th>
                <th>Unidade</th>
                <th>Entregador</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map((delivery) => {
                const statusBadge = getDashboardDeliveryStatusBadge(delivery.status);

                return (
                  <tr key={delivery.id}>
                    <td className="dashboard-table__code">{delivery.code}</td>
                    <td className="dashboard-table__title">
                      <strong>{delivery.recipientName}</strong>
                    </td>
                    <td>{formatDashboardUnitLabel(delivery.unitLabel)}</td>
                    <td>{delivery.courierName ?? 'Nao atribuido'}</td>
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
