import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTenantContext } from '@/app/tenant/tenantContext';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { AttachmentLinks } from '@/components/attachments/AttachmentLinks';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/feedback/StatusBadge';
import { ConfirmActionModal } from '@/components/modals/ConfirmActionModal';
import { EmptyState } from '@/components/states/EmptyState';
import { ErrorState } from '@/components/states/ErrorState';
import { getUnits } from '@/modules/structure/services/units.service';
import { TicketAssignControl } from '@/modules/tickets/components/TicketAssignControl';
import { TicketMessages } from '@/modules/tickets/components/TicketMessages';
import { TicketStatusControl } from '@/modules/tickets/components/TicketStatusControl';
import { TicketTimeline } from '@/modules/tickets/components/TicketTimeline';
import {
  formatTicketDateTime,
  getTicketPriorityBadge,
  getTicketSlaBadge,
  getTicketStatusBadge,
} from '@/modules/tickets/helpers';
import {
  assignTicket,
  getTicketById,
  reopenTicket,
  sendTicketMessage,
  updateTicketStatus,
} from '@/modules/tickets/services/tickets.service';
import { getStaff } from '@/modules/users/services/staff.service';
import { buildTenantPath } from '@/routes/nav';
import { getErrorMessage, isForbiddenError } from '@/services/errors';

export function TicketDetailPage() {
  const { instanceKey } = useTenantContext();
  const { id = '' } = useParams();
  const queryClient = useQueryClient();

  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [reopenReason, setReopenReason] = useState('');
  const [isReopenModalOpen, setIsReopenModalOpen] = useState(false);

  useEffect(() => {
    setFeedbackMessage(null);
    setReopenReason('');
    setIsReopenModalOpen(false);
  }, [instanceKey, id]);

  const detailQuery = useQuery({
    queryKey: ['tickets', instanceKey, 'detail', id],
    queryFn: () => getTicketById(instanceKey, id),
    enabled: Boolean(instanceKey && id),
  });

  const staffQuery = useQuery({
    queryKey: ['tickets', instanceKey, 'detail-staff'],
    queryFn: () =>
      getStaff(instanceKey, {
        page: 1,
        limit: 200,
        role: 'FUNC_MANUTENCAO',
        status: 'active',
      }),
    enabled: Boolean(instanceKey),
  });

  const unitsQuery = useQuery({
    queryKey: ['tickets', instanceKey, 'detail-units'],
    queryFn: () => getUnits(instanceKey, { page: 1, limit: 200 }),
    enabled: Boolean(instanceKey),
  });

  const sendMessageMutation = useMutation({
    mutationFn: (payload: { message: string; attachmentId?: string }) =>
      sendTicketMessage(instanceKey, id, payload),
    onSuccess: () => {
      setFeedbackMessage('Mensagem enviada com sucesso.');
      queryClient.invalidateQueries({ queryKey: ['tickets', instanceKey] });
    },
  });

  const assignMutation = useMutation({
    mutationFn: (userId: string) => assignTicket(instanceKey, id, { userId }),
    onSuccess: () => {
      setFeedbackMessage('Responsavel atualizado com sucesso.');
      queryClient.invalidateQueries({ queryKey: ['tickets', instanceKey] });
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => updateTicketStatus(instanceKey, id, { status }),
    onSuccess: () => {
      setFeedbackMessage('Status atualizado com sucesso.');
      queryClient.invalidateQueries({ queryKey: ['tickets', instanceKey] });
    },
  });

  const reopenMutation = useMutation({
    mutationFn: () => reopenTicket(instanceKey, id, { reason: reopenReason.trim() || undefined }),
    onSuccess: () => {
      setFeedbackMessage('Ticket reaberto com sucesso.');
      setReopenReason('');
      setIsReopenModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['tickets', instanceKey] });
    },
  });

  const detail = detailQuery.data;
  const ticket = detail?.ticket ?? null;

  const statusBadge = ticket ? getTicketStatusBadge(ticket.status) : null;
  const priorityBadge = ticket ? getTicketPriorityBadge(ticket.priority) : null;
  const slaBadge = ticket ? getTicketSlaBadge(ticket) : null;

  const unitLabel = useMemo(() => {
    if (ticket?.unitLabel) {
      return ticket.unitLabel;
    }

    const unit = (unitsQuery.data?.data ?? []).find((item) => item.id === ticket?.unitId);
    return unit ? `${unit.block.name} - ${unit.number}` : 'Nao informada';
  }, [ticket?.unitId, ticket?.unitLabel, unitsQuery.data?.data]);

  if (detailQuery.error && isForbiddenError(detailQuery.error)) {
    return (
      <PermissionGuard allow={['SINDICO_ADMIN', 'FUNC_MANUTENCAO']}>
        <div className="page-stack">
          <PageHeader title="Detalhe do ticket" description="Gerencie o historico completo do chamado." />
          <ErrorState
            title="Acesso negado ao ticket"
            description="O backend retornou 403 para este detalhe tenant."
            code="403"
          />
        </div>
      </PermissionGuard>
    );
  }

  if (detailQuery.error) {
    return (
      <PermissionGuard allow={['SINDICO_ADMIN', 'FUNC_MANUTENCAO']}>
        <div className="page-stack">
          <PageHeader title="Detalhe do ticket" description="Gerencie o historico completo do chamado." />
          <ErrorState
            title="Falha ao carregar ticket"
            description={getErrorMessage(detailQuery.error)}
          />
        </div>
      </PermissionGuard>
    );
  }

  if (detailQuery.isLoading) {
    return (
      <PermissionGuard allow={['SINDICO_ADMIN', 'FUNC_MANUTENCAO']}>
        <div className="page-stack">
          <PageHeader title="Detalhe do ticket" description="Carregando detalhe operacional..." />
          <div>Carregando ticket...</div>
        </div>
      </PermissionGuard>
    );
  }

  if (!ticket) {
    return (
      <PermissionGuard allow={['SINDICO_ADMIN', 'FUNC_MANUTENCAO']}>
        <div className="page-stack">
          <PageHeader title="Detalhe do ticket" description="Gerencie o historico completo do chamado." />
          <EmptyState
            title="Ticket nao encontrado"
            description="O backend nao retornou dados para este identificador."
            action={
              <Link className="button button--primary" to={buildTenantPath(instanceKey, '/tickets')}>
                Voltar para tickets
              </Link>
            }
          />
        </div>
      </PermissionGuard>
    );
  }

  return (
    <PermissionGuard allow={['SINDICO_ADMIN', 'FUNC_MANUTENCAO']}>
      <div className="page-stack">
        <PageHeader
          title={ticket.title}
          description={ticket.description || 'Acompanhe mensagens, timeline, SLA e historico de status.'}
          badge={detailQuery.isFetching ? 'Atualizando detalhe' : undefined}
          actions={
            <Link className="button button--ghost" to={buildTenantPath(instanceKey, '/tickets')}>
              Voltar para tickets
            </Link>
          }
        />

        {feedbackMessage ? (
          <div className="inline-feedback inline-feedback--success">{feedbackMessage}</div>
        ) : null}

        <section className="panel-card">
          <div className="panel-card__header">
            <div>
              <h2>Resumo do ticket</h2>
              <p>Historico, mensagens e acoes rapidas em uma unica tela.</p>
            </div>
            <div className="detail-chip-group">
              {statusBadge ? <StatusBadge status={statusBadge.status} label={statusBadge.label} /> : null}
              {priorityBadge ? <StatusBadge status={priorityBadge.status} label={priorityBadge.label} /> : null}
              {slaBadge ? <StatusBadge status={slaBadge.status} label={slaBadge.label} /> : null}
            </div>
          </div>

          <div className="panel-card__body page-stack">
            <div className="detail-grid">
              <section className="detail-section">
                <h3 className="detail-section__title">Dados principais</h3>
                <div className="detail-list">
                  <div className="detail-list__item">
                    <strong>Unidade</strong>
                    <span>{unitLabel}</span>
                  </div>
                  <div className="detail-list__item">
                    <strong>Categoria</strong>
                    <span>{ticket.category ?? 'Nao informada'}</span>
                  </div>
                  <div className="detail-list__item">
                    <strong>Local</strong>
                    <span>{ticket.location ?? 'Nao informado'}</span>
                  </div>
                  <div className="detail-list__item">
                    <strong>Responsavel</strong>
                    <span>{ticket.assignee?.name ?? 'Sem responsavel'}</span>
                  </div>
                  <div className="detail-list__item">
                    <strong>Criado em</strong>
                    <span>{formatTicketDateTime(ticket.createdAt)}</span>
                  </div>
                  <div className="detail-list__item">
                    <strong>SLA</strong>
                    <span>{formatTicketDateTime(ticket.dueAt)}</span>
                  </div>
                </div>
              </section>

              <section className="detail-section">
                <h3 className="detail-section__title">Acoes rapidas</h3>
                <div className="page-stack">
                  <TicketStatusControl
                    value={ticket.status}
                    onChange={async (status) => {
                      await statusMutation.mutateAsync(status);
                    }}
                    isSubmitting={statusMutation.isPending}
                  />

                  <TicketAssignControl
                    assignees={(staffQuery.data?.data ?? []).map((staff) => ({
                      id: staff.id,
                      name: staff.name,
                    }))}
                    currentAssigneeId={ticket.assignee?.id}
                    onAssign={async (userId) => {
                      await assignMutation.mutateAsync(userId);
                    }}
                    isSubmitting={assignMutation.isPending}
                  />

                  <div className="control-card">
                    <div className="control-card__copy">
                      <h3>Reabrir ticket</h3>
                      <p>Use este fluxo quando o chamado precisar voltar para acompanhamento.</p>
                    </div>
                    <div className="page-stack">
                      <textarea
                        className="field__input"
                        rows={3}
                        placeholder="Motivo da reabertura (opcional)"
                        value={reopenReason}
                        onChange={(event) => setReopenReason(event.target.value)}
                      />
                      <button
                        type="button"
                        className="button button--warning"
                        onClick={() => setIsReopenModalOpen(true)}
                      >
                        Reabrir ticket
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {ticket.attachmentIds.length > 0 ? (
              <section className="detail-section">
                <h3 className="detail-section__title">Anexos do ticket</h3>
                <AttachmentLinks
                  instanceKey={instanceKey}
                  attachmentIds={ticket.attachmentIds}
                />
              </section>
            ) : null}

            <div className="detail-grid">
              <section className="detail-section">
                <h3 className="detail-section__title">Mensagens</h3>
                <TicketMessages
                  instanceKey={instanceKey}
                  messages={detail?.messages ?? []}
                  onSendMessage={async (payload) => {
                    await sendMessageMutation.mutateAsync(payload);
                  }}
                  isSubmitting={sendMessageMutation.isPending}
                  error={sendMessageMutation.error}
                />
              </section>

              <section className="detail-section">
                <h3 className="detail-section__title">Historico de status</h3>
                {detail?.statusHistory.length ? (
                  <div className="detail-list">
                    {detail.statusHistory.map((item) => {
                      const badge = getTicketStatusBadge(item.toStatus);
                      return (
                        <div key={item.id} className="detail-list__item detail-list__item--stack">
                          <strong>{formatTicketDateTime(item.createdAt)}</strong>
                          <div className="detail-chip-group">
                            {item.fromStatus ? (
                              <StatusBadge
                                status={getTicketStatusBadge(item.fromStatus).status}
                                label={getTicketStatusBadge(item.fromStatus).label}
                              />
                            ) : null}
                            <StatusBadge status={badge.status} label={badge.label} />
                          </div>
                          <span>{item.actorName ?? 'Sistema'}</span>
                          {item.reason ? <span>{item.reason}</span> : null}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="table-empty">
                    Nenhuma mudanca de status retornada para este ticket.
                  </div>
                )}
              </section>
            </div>

            <section className="detail-section">
              <h3 className="detail-section__title">Timeline</h3>
              <TicketTimeline
                instanceKey={instanceKey}
                items={detail?.timeline ?? []}
              />
            </section>
          </div>
        </section>

        <ConfirmActionModal
          isOpen={isReopenModalOpen}
          title="Reabrir ticket"
          description="Confirme a reabertura deste ticket para retomar o acompanhamento operacional."
          confirmLabel="Reabrir agora"
          variant="warning"
          onConfirm={() => void reopenMutation.mutateAsync()}
          onCancel={() => setIsReopenModalOpen(false)}
          isLoading={reopenMutation.isPending}
        />
      </div>
    </PermissionGuard>
  );
}
