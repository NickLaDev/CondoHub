import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTenantContext } from '@/app/tenant/tenantContext';
import { AuditList } from '@/components/audit/AuditList';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { PageHeader } from '@/components/common/PageHeader';
import { DrawerDetail } from '@/components/drawer/DrawerDetail';
import { EmptyState } from '@/components/states/EmptyState';
import { ErrorState } from '@/components/states/ErrorState';
import { LogsFilters } from '@/modules/logs/components/LogsFilters';
import { LogDetail } from '@/modules/logs/components/LogDetail';
import { getInstanceLogs } from '@/modules/logs/services/logs.service';
import type { InstanceLogEntry } from '@/modules/logs/types';
import { getUnits } from '@/modules/structure/services/units.service';
import { getErrorMessage, isForbiddenError } from '@/services/errors';

const PAGE_SIZE = 20;

export function LogsPage() {
  const { instanceKey } = useTenantContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedLog, setSelectedLog] = useState<InstanceLogEntry | null>(null);

  const page = Number(searchParams.get('page') || '1');
  const search = searchParams.get('search') || '';
  const unitId = searchParams.get('unitId') || '';
  const action = searchParams.get('action') || '';
  const actor = searchParams.get('actor') || '';
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';

  const logsQuery = useQuery({
    queryKey: ['logs', instanceKey, { page, search, unitId, action, actor, startDate, endDate }],
    queryFn: () =>
      getInstanceLogs(instanceKey, {
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        unitId: unitId || undefined,
        action: action || undefined,
        actor: actor || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }),
    enabled: Boolean(instanceKey),
    placeholderData: keepPreviousData,
  });

  const unitsQuery = useQuery({
    queryKey: ['logs', instanceKey, 'units'],
    queryFn: () => getUnits(instanceKey, { page: 1, limit: 200 }),
    enabled: Boolean(instanceKey),
  });

  const unitOptions = useMemo(
    () => (unitsQuery.data?.data ?? []).map((unit) => ({
      id: unit.id,
      label: `${unit.block.name} - ${unit.number}`,
    })),
    [unitsQuery.data?.data],
  );

  const handlePageChange = (nextPage: number) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('page', String(nextPage));
    setSearchParams(nextParams);
  };

  if (logsQuery.error && isForbiddenError(logsQuery.error)) {
    return (
      <PermissionGuard allow={['SINDICO_ADMIN']} allowPermissions={['logs:read']}>
        <div className="page-stack">
          <PageHeader title="Logs" description="Consulte a auditoria append-only da instancia." />
          <ErrorState
            title="Acesso negado aos logs"
            description="O backend retornou 403 para este modulo tenant."
            code="403"
          />
        </div>
      </PermissionGuard>
    );
  }

  if (logsQuery.error) {
    return (
      <PermissionGuard allow={['SINDICO_ADMIN']} allowPermissions={['logs:read']}>
        <div className="page-stack">
          <PageHeader title="Logs" description="Consulte a auditoria append-only da instancia." />
          <ErrorState
            title="Falha ao carregar logs"
            description={getErrorMessage(logsQuery.error)}
          />
        </div>
      </PermissionGuard>
    );
  }

  const logsResponse = logsQuery.data;

  return (
    <PermissionGuard allow={['SINDICO_ADMIN']} allowPermissions={['logs:read']}>
      <div className="page-stack">
        <PageHeader
          title="Logs"
          description="Auditoria tenant com filtros persistidos, paginacao server-side e detalhe seguro em drawer."
          badge={logsQuery.isFetching ? 'Atualizando consulta' : undefined}
        />

        <section className="panel-card">
          <div className="panel-card__header">
            <div>
              <h2>Auditoria da instancia</h2>
              <p>Consulte eventos por periodo, ator, acao, unidade e texto livre.</p>
            </div>
          </div>
          <div className="panel-card__body page-stack">
            <LogsFilters units={unitOptions} />

            <AuditList
              logs={logsResponse?.data ?? []}
              loading={logsQuery.isLoading}
              pagination={logsResponse?.pagination
                ? {
                    currentPage: logsResponse.pagination.page,
                    totalPages: logsResponse.pagination.totalPages,
                    totalItems: logsResponse.pagination.total,
                    onPageChange: handlePageChange,
                  }
                : undefined}
              onOpenDetail={setSelectedLog}
            />

            {!logsQuery.isLoading && (logsResponse?.data.length ?? 0) === 0 ? (
              <EmptyState
                title="Nenhum log encontrado"
                description="Ajuste os filtros ou remova restricoes para ampliar a consulta."
              />
            ) : null}
          </div>
        </section>

        <DrawerDetail
          isOpen={Boolean(selectedLog)}
          onClose={() => setSelectedLog(null)}
          title={selectedLog?.action ?? 'Detalhe do log'}
          description="Visualizacao estruturada do evento de auditoria."
        >
          {selectedLog ? <LogDetail log={selectedLog} /> : null}
        </DrawerDetail>
      </div>
    </PermissionGuard>
  );
}


