import {
  AlertOctagon,
  Package,
  RotateCcw,
  Ticket,
} from 'lucide-react';
import { useTenantContext } from '@/app/tenant/tenantContext';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { KpiCard } from '@/components/common/KpiCard';
import { EmptyState } from '@/components/states/EmptyState';
import { ErrorState } from '@/components/states/ErrorState';
import { CriticalTicketsTable } from '@/modules/dashboard/components/CriticalTicketsTable';
import { DashboardLoadingState } from '@/modules/dashboard/components/DashboardLoadingState';
import { DistributionDeliveriesTable } from '@/modules/dashboard/components/DistributionDeliveriesTable';
import { RecentLogsPanel } from '@/modules/dashboard/components/RecentLogsPanel';
import { useDashboardSummary } from '@/modules/dashboard/hooks';
import type { DashboardSummary } from '@/modules/dashboard/types';
import { buildTenantPath } from '@/routes/nav';
import { isForbiddenError } from '@/services/errors';

function isDashboardEmpty(summary: DashboardSummary) {
  return (
    summary.metrics.openTickets === 0 &&
    summary.metrics.overdueSla === 0 &&
    summary.metrics.reopenedTickets === 0 &&
    summary.metrics.pendingDeliveries === 0 &&
    summary.criticalTickets.length === 0 &&
    summary.deliveriesInDistribution.length === 0 &&
    summary.recentLogs.length === 0
  );
}

export function DashboardPage() {
  const { instanceKey } = useTenantContext();
  const dashboardSummary = useDashboardSummary(instanceKey);

  return (
    <PermissionGuard allow={['SINDICO_ADMIN']}>
      <div className="page-stack dashboard-page">
        <header className="dashboard-page__intro">
          <div className="dashboard-page__copy">
            <div className="dashboard-page__heading">
              <h1>Dashboard</h1>
              {dashboardSummary.isFetching && !dashboardSummary.isLoading ? (
                <span className="dashboard-page__badge">Atualizando dados</span>
              ) : null}
            </div>
            <p>Visao geral do condominio</p>
          </div>
        </header>

        {dashboardSummary.isLoading ? <DashboardLoadingState /> : null}

        {!dashboardSummary.isLoading && dashboardSummary.error ? (
          <ErrorState
            title={isForbiddenError(dashboardSummary.error) ? 'Acesso negado ao dashboard' : 'Falha ao carregar dashboard'}
            description={
              isForbiddenError(dashboardSummary.error)
                ? 'O backend retornou 403 para este resumo da instancia. Verifique as permissoes do usuario tenant.'
                : 'Nao foi possivel carregar o resumo operacional. Tente novamente quando a API tenant estiver disponivel.'
            }
            code={isForbiddenError(dashboardSummary.error) ? '403' : 'DASHBOARD_ERROR'}
            action={
              <button
                type="button"
                className="button button--primary"
                onClick={() => void dashboardSummary.refetch()}
              >
                Tentar novamente
              </button>
            }
          />
        ) : null}

        {!dashboardSummary.isLoading &&
        !dashboardSummary.error &&
        dashboardSummary.data &&
        isDashboardEmpty(dashboardSummary.data) ? (
          <EmptyState
            title="Resumo operacional ainda vazio"
            description="O dashboard ja esta preparado, mas a API ainda nao retornou indicadores ou listas para esta instancia."
            action={
              <button
                type="button"
                className="button button--primary"
                onClick={() => void dashboardSummary.refetch()}
              >
                Atualizar dados
              </button>
            }
          />
        ) : null}

        {!dashboardSummary.isLoading &&
        !dashboardSummary.error &&
        dashboardSummary.data &&
        !isDashboardEmpty(dashboardSummary.data) ? (
          <>
            <section className="kpi-grid">
              <KpiCard
                title="Tickets abertos"
                value={dashboardSummary.data.metrics.openTickets}
                description="em andamento"
                tone="primary"
                icon={<Ticket size={18} />}
              />
              <KpiCard
                title="SLA atrasado"
                value={dashboardSummary.data.metrics.overdueSla}
                description="necessitam atencao"
                tone="danger"
                icon={<AlertOctagon size={18} />}
              />
              <KpiCard
                title="Reabertos"
                value={dashboardSummary.data.metrics.reopenedTickets}
                description="tickets reabertos"
                tone="warning"
                icon={<RotateCcw size={18} />}
              />
              <KpiCard
                title="Encomendas pendentes"
                value={dashboardSummary.data.metrics.pendingDeliveries}
                description="aguardando entrega"
                tone="violet"
                icon={<Package size={18} />}
              />
            </section>

            <section className="dashboard-grid">
              <CriticalTicketsTable
                tickets={dashboardSummary.data.criticalTickets}
                linkTo={buildTenantPath(instanceKey, '/tickets')}
              />

              <DistributionDeliveriesTable
                deliveries={dashboardSummary.data.deliveriesInDistribution}
                linkTo={buildTenantPath(instanceKey, '/deliveries')}
              />
            </section>

            <RecentLogsPanel
              logs={dashboardSummary.data.recentLogs}
              linkTo={buildTenantPath(instanceKey, '/logs')}
            />
          </>
        ) : null}
      </div>
    </PermissionGuard>
  );
}
