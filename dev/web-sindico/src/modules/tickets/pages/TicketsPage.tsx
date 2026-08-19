import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTenantContext } from '@/app/tenant/tenantContext';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable } from '@/components/data/DataTable';
import { StatusBadge } from '@/components/feedback/StatusBadge';
import { FormModal } from '@/components/modals/FormModal';
import { EmptyState } from '@/components/states/EmptyState';
import { ErrorState } from '@/components/states/ErrorState';
import { getUnits } from '@/modules/structure/services/units.service';
import { TicketFilters } from '@/modules/tickets/components/TicketFilters';
import { TicketForm } from '@/modules/tickets/components/TicketForm';
import {
  formatTicketDateTime,
  getTicketPriorityBadge,
  getTicketSlaBadge,
  getTicketStatusBadge,
} from '@/modules/tickets/helpers';
import {
  createTicket,
  getTickets,
} from '@/modules/tickets/services/tickets.service';
import type { CreateTicketRequest, TicketSummary } from '@/modules/tickets/types';
import { getStaff } from '@/modules/users/services/staff.service';
import { buildTenantPath } from '@/routes/nav';
import { getErrorMessage, isForbiddenError } from '@/services/errors';
import { createEmptyPaginatedResponse } from '@/services/pagination';

const PAGE_SIZE = 10;

export function TicketsPage() {
  const { instanceKey } = useTenantContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const page = Number(searchParams.get('page') || '1');
  const status = searchParams.get('status') || '';
  const unitId = searchParams.get('unitId') || '';
  const assignedTo = searchParams.get('assignedTo') || '';
  const overdue = searchParams.get('overdue') === 'true';
  const search = searchParams.get('search') || '';

  const ticketsQuery = useQuery({
    queryKey: ['tickets', instanceKey, { page, status, unitId, assignedTo, overdue, search }],
    queryFn: () =>
      getTickets(instanceKey, {
        page,
        limit: PAGE_SIZE,
        status: status || undefined,
        unitId: unitId || undefined,
        assignedTo: assignedTo || undefined,
        overdue: overdue || undefined,
        search: search || undefined,
      }),
    enabled: Boolean(instanceKey),
    placeholderData: keepPreviousData,
  });

  const unitsQuery = useQuery({
    queryKey: ['tickets', instanceKey, 'units-filter'],
    queryFn: () => getUnits(instanceKey, { page: 1, limit: 200 }),
    enabled: Boolean(instanceKey),
  });

  const staffQuery = useQuery({
    queryKey: ['tickets', instanceKey, 'maintenance-staff'],
    queryFn: () =>
      getStaff(instanceKey, {
        page: 1,
        limit: 200,
        role: 'FUNC_MANUTENCAO',
        status: 'active',
      }),
    enabled: Boolean(instanceKey),
  });

  const createTicketMutation = useMutation({
    mutationFn: (createTicketData: CreateTicketRequest) =>
      createTicket(instanceKey, createTicketData),
    onSuccess: (ticket) => {
      setFeedbackMessage('Ticket criado com sucesso.');
      setIsCreateModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['tickets', instanceKey] });
      if (ticket.id) {
        navigate(buildTenantPath(instanceKey, `/tickets/${ticket.id}`));
      }
    },
  });

  const ticketRows =
    ticketsQuery.data
    ?? createEmptyPaginatedResponse<TicketSummary>({
      page,
      limit: PAGE_SIZE,
    });

  const unitOptions = useMemo(
    () =>
      (unitsQuery.data?.data ?? []).map((unit) => ({
        id: unit.id,
        label: `${unit.block.name} - ${unit.number}`,
      })),
    [unitsQuery.data?.data],
  );

  const assigneeOptions = useMemo(
    () =>
      (staffQuery.data?.data ?? []).map((staff) => ({
        id: staff.id,
        label: staff.name,
      })),
    [staffQuery.data?.data],
  );

  const columns = [
    {
      key: 'title',
      header: 'Ticket',
      render: (_value: string, item: TicketSummary) => (
        <div className="table-cell-stack">
          <strong>{item.title}</strong>
          <span>{item.category ?? item.location ?? item.description}</span>
        </div>
      ),
    },
    {
      key: 'unitLabel',
      header: 'Unidade',
      render: (value: string | null) => value ?? 'Nao informada',
    },
    {
      key: 'status',
      header: 'Status',
      render: (value: string) => {
        const badge = getTicketStatusBadge(value);
        return <StatusBadge status={badge.status} label={badge.label} />;
      },
    },
    {
      key: 'priority',
      header: 'Prioridade',
      render: (value: string) => {
        const badge = getTicketPriorityBadge(value);
        return <StatusBadge status={badge.status} label={badge.label} />;
      },
    },
    {
      key: 'dueAt',
      header: 'SLA',
      render: (_value: string | null, item: TicketSummary) => {
        const badge = getTicketSlaBadge(item);
        return (
          <div className="table-cell-stack">
            <StatusBadge status={badge.status} label={badge.label} />
            <span>{formatTicketDateTime(item.dueAt)}</span>
          </div>
        );
      },
    },
    {
      key: 'assignee',
      header: 'Responsavel',
      render: (_value: unknown, item: TicketSummary) => item.assignee?.name ?? 'Sem responsavel',
    },
  ];

  const handlePageChange = (nextPage: number) => {
    setSearchParams((currentParams) => {
      const nextParams = new URLSearchParams(currentParams);
      nextParams.set('page', String(nextPage));
      return nextParams;
    });
  };

  if (ticketsQuery.error && isForbiddenError(ticketsQuery.error)) {
    return (
      <PermissionGuard allow={['SINDICO_ADMIN', 'FUNC_MANUTENCAO']}>
        <div className="page-stack">
          <PageHeader title="Tickets" description="Gerencie os chamados operacionais do condominio." />
          <ErrorState
            title="Acesso negado aos tickets"
            description="O backend retornou 403 para esta listagem tenant."
            code="403"
          />
        </div>
      </PermissionGuard>
    );
  }

  if (ticketsQuery.error) {
    return (
      <PermissionGuard allow={['SINDICO_ADMIN', 'FUNC_MANUTENCAO']}>
        <div className="page-stack">
          <PageHeader title="Tickets" description="Gerencie os chamados operacionais do condominio." />
          <ErrorState
            title="Falha ao carregar tickets"
            description={getErrorMessage(ticketsQuery.error)}
          />
        </div>
      </PermissionGuard>
    );
  }

  return (
    <PermissionGuard allow={['SINDICO_ADMIN', 'FUNC_MANUTENCAO']}>
      <div className="page-stack">
        <PageHeader
          title="Tickets"
          description="Controle chamados com prioridade, SLA e roteamento operacional por responsavel."
          badge={ticketsQuery.isFetching ? 'Atualizando listagem' : undefined}
          actions={
            <button
              type="button"
              className="button button--add"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <Plus size={16} /> Novo ticket
            </button>
          }
        />

        {feedbackMessage ? (
          <div className="inline-feedback inline-feedback--success">{feedbackMessage}</div>
        ) : null}

        <section className="panel-card">
          <div className="panel-card__header">
            <div>
              <h2>Listagem operacional</h2>
              <p>Filtros persistem na URL e a paginacao continua no backend.</p>
            </div>
          </div>
          <div className="panel-card__body page-stack">
            <TicketFilters units={unitOptions} assignees={assigneeOptions} />

            <DataTable
              columns={columns}
              data={ticketRows.data}
              loading={ticketsQuery.isLoading}
              emptyMessage="Nenhum ticket encontrado para os filtros atuais."
              pagination={{
                currentPage: ticketRows.pagination.page,
                totalPages: ticketRows.pagination.totalPages,
                totalItems: ticketRows.pagination.total,
                onPageChange: handlePageChange,
              }}
              actions={(item) => (
                <Link
                  className="table-link"
                  to={buildTenantPath(instanceKey, `/tickets/${item.id}`)}
                >
                  Abrir detalhe
                </Link>
              )}
            />

            {!ticketsQuery.isLoading && ticketRows.data.length === 0 ? (
              <EmptyState
                title="Nenhum ticket encontrado"
                description="Ajuste os filtros ou crie um novo chamado para esta instancia."
                action={
                  <button
                    type="button"
                    className="button button--add"
                    onClick={() => setIsCreateModalOpen(true)}
                  >
                    Criar ticket
                  </button>
                }
              />
            ) : null}
          </div>
        </section>

        <FormModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Novo ticket"
          size="lg"
        >
          <TicketForm
            instanceKey={instanceKey}
            units={unitsQuery.data?.data ?? []}
            onSubmit={async (payload) => {
              await createTicketMutation.mutateAsync(payload);
            }}
            onCancel={() => setIsCreateModalOpen(false)}
            isSubmitting={createTicketMutation.isPending}
            error={createTicketMutation.error}
          />
        </FormModal>
      </div>
    </PermissionGuard>
  );
}
