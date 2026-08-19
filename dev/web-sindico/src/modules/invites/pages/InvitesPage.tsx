import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTenantContext } from '@/app/tenant/tenantContext';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable } from '@/components/data/DataTable';
import { StatusBadge } from '@/components/feedback/StatusBadge';
import { FilterBar } from '@/components/filters/FilterBar';
import { ConfirmActionModal } from '@/components/modals/ConfirmActionModal';
import { FormModal } from '@/components/modals/FormModal';
import { EmptyState } from '@/components/states/EmptyState';
import { ErrorState } from '@/components/states/ErrorState';
import { InviteForm } from '@/modules/invites/components/InviteForm';
import {
  cancelActiveInviteCode,
  createInvite,
  createInviteCode,
  getActiveInviteCode,
  getInvites,
  revokeInvite,
} from '@/modules/invites/services/invites.service';
import type {
  ActiveInviteCode,
  CreateInviteRequest,
  Invite,
  InviteCode,
  InviteStatus,
  InviteType,
} from '@/modules/invites/types';
import { getErrorMessage, isForbiddenError } from '@/services/errors';
import { createEmptyPaginatedResponse } from '@/services/pagination';

const PAGE_SIZE = 10;

const typeLabels: Record<InviteType, string> = {
  MORADOR: 'Morador',
  SINDICO_ADMIN: 'Sindico Admin',
  FUNC_ENTREGAS: 'Entregas',
  FUNC_MANUTENCAO: 'Manutencao',
};

function getTypeBadge(type: InviteType) {
  if (type === 'MORADOR') {
    return { status: 'info' as const, label: typeLabels[type] };
  }

  if (type === 'SINDICO_ADMIN') {
    return { status: 'warning' as const, label: typeLabels[type] };
  }

  return { status: 'neutral' as const, label: typeLabels[type] };
}

function getInviteStatus(invite: Invite) {
  const isExpired = invite.status === 'PENDING' && new Date(invite.expiresAt).getTime() < Date.now();

  if (isExpired || invite.status === 'EXPIRED') {
    return { status: 'expired' as const, label: 'Expirado' };
  }

  const mapping: Record<InviteStatus, { status: 'pending' | 'success' | 'archived'; label: string }> = {
    PENDING: { status: 'pending', label: 'Pendente' },
    USED: { status: 'success', label: 'Usado' },
    EXPIRED: { status: 'archived', label: 'Expirado' },
    REVOKED: { status: 'archived', label: 'Revogado' },
  };

  return mapping[invite.status];
}

export function InvitesPage() {
  const { instanceKey } = useTenantContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [inviteToRevoke, setInviteToRevoke] = useState<Invite | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [freshCode, setFreshCode] = useState<InviteCode | null>(null);

  const page = Number(searchParams.get('page') || '1');
  const search = searchParams.get('search') || '';
  const type = searchParams.get('type') || '';
  const status = searchParams.get('status') || '';

  useEffect(() => {
    setIsFormModalOpen(false);
    setInviteToRevoke(null);
    setFeedbackMessage(null);
    setFreshCode(null);
  }, [instanceKey]);

  const invitesQuery = useQuery({
    queryKey: ['invites', instanceKey, { page, search, type, status }],
    queryFn: () =>
      getInvites(instanceKey, {
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        type: type || undefined,
        status: status || undefined,
      }),
    enabled: Boolean(instanceKey),
    placeholderData: keepPreviousData,
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateInviteRequest) => createInvite(instanceKey, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invites', instanceKey] });
      setIsFormModalOpen(false);
      setFeedbackMessage('Convite criado com sucesso.');
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (inviteId: string) => revokeInvite(instanceKey, inviteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invites', instanceKey] });
      setInviteToRevoke(null);
      setFeedbackMessage('Convite revogado com sucesso.');
    },
  });

  const activeCodeQuery = useQuery<ActiveInviteCode | null>({
    queryKey: ['invites', instanceKey, 'active-code'],
    queryFn: () => getActiveInviteCode(instanceKey),
    enabled: Boolean(instanceKey),
  });

  const createCodeMutation = useMutation({
    mutationFn: () => createInviteCode(instanceKey),
    onSuccess: (code) => {
      queryClient.invalidateQueries({ queryKey: ['invites', instanceKey, 'active-code'] });
      setFreshCode(code);
    },
    onError: (error) => {
      setFeedbackMessage(getErrorMessage(error, 'Nao foi possivel gerar o codigo de convite.'));
    },
  });

  const cancelCodeMutation = useMutation({
    mutationFn: () => cancelActiveInviteCode(instanceKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invites', instanceKey, 'active-code'] });
      setFreshCode(null);
      setFeedbackMessage('Codigo de convite cancelado.');
    },
    onError: (error) => {
      setFeedbackMessage(getErrorMessage(error, 'Nao foi possivel cancelar o codigo de convite.'));
    },
  });

  const inviteRows = invitesQuery.data ?? createEmptyPaginatedResponse<Invite>({
    page,
    limit: PAGE_SIZE,
  });

  const updateParam = (key: string, value: string) => {
    const nextParams = new URLSearchParams(searchParams);

    if (value) {
      nextParams.set(key, value);
    } else {
      nextParams.delete(key);
    }

    nextParams.set('page', '1');
    setSearchParams(nextParams);
  };

  const handlePageChange = (nextPage: number) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('page', String(nextPage));
    setSearchParams(nextParams);
  };

  const columns = [
    {
      key: 'email',
      header: 'Convite',
      render: (_value: string, invite: Invite) => (
        <div className="table-cell-stack">
          <strong>{invite.email}</strong>
          <span>{invite.unit ? `${invite.unit.block.name} - ${invite.unit.number}` : 'Sem unidade vinculada'}</span>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Tipo',
      render: (value: InviteType) => {
        const badge = getTypeBadge(value);
        return <StatusBadge status={badge.status} label={badge.label} />;
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (_value: InviteStatus, invite: Invite) => {
        const badge = getInviteStatus(invite);
        return <StatusBadge status={badge.status} label={badge.label} />;
      },
    },
    {
      key: 'expiresAt',
      header: 'Expira em',
      render: (value: string) =>
        new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)),
    },
  ];

  const inviteTypeOptions = useMemo(
    () => Object.entries(typeLabels).map(([value, label]) => ({ value, label })),
    [],
  );

  if (invitesQuery.error && isForbiddenError(invitesQuery.error)) {
    return (
      <PermissionGuard allow={['SINDICO_ADMIN']}>
        <div className="page-stack">
          <PageHeader title="Convites" description="Gerencie convites de acesso da instancia." />
          <ErrorState
            title="Acesso negado aos convites"
            description="O backend retornou 403 para esta listagem tenant."
            code="403"
          />
        </div>
      </PermissionGuard>
    );
  }

  if (invitesQuery.error) {
    return (
      <PermissionGuard allow={['SINDICO_ADMIN']}>
        <div className="page-stack">
          <PageHeader title="Convites" description="Gerencie convites de acesso da instancia." />
          <ErrorState
            title="Falha ao carregar convites"
            description={getErrorMessage(invitesQuery.error)}
          />
        </div>
      </PermissionGuard>
    );
  }

  return (
    <PermissionGuard allow={['SINDICO_ADMIN']}>
      <div className="page-stack">
        <PageHeader
          title="Convites"
          description="Compartilhe acessos com filtros persistidos na URL e acompanhamento de expiracao."
          badge={invitesQuery.isFetching ? 'Atualizando listagem' : undefined}
          actions={
            <button
              type="button"
              className="button button--add"
              onClick={() => setIsFormModalOpen(true)}
            >
              <Plus size={16} /> Novo convite
            </button>
          }
        />

        {feedbackMessage ? (
          <div className="inline-feedback inline-feedback--success">{feedbackMessage}</div>
        ) : null}

        <section className="panel-card">
          <div className="panel-card__header">
            <div>
              <h2>Convites emitidos</h2>
              <p>Filtre por tipo, status e texto livre sem perder o contexto ao atualizar a pagina.</p>
            </div>
          </div>
          <div className="panel-card__body page-stack">
            <FilterBar placeholder="Buscar por email ou unidade...">
              <label className="field toolbar-row__field">
                <span className="field__label">Tipo</span>
                <select
                  className="field__input"
                  value={type}
                  onChange={(event) => updateParam('type', event.target.value)}
                >
                  <option value="">Todos</option>
                  {inviteTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field toolbar-row__field">
                <span className="field__label">Status</span>
                <select
                  className="field__input"
                  value={status}
                  onChange={(event) => updateParam('status', event.target.value)}
                >
                  <option value="">Todos</option>
                  <option value="PENDING">Pendente</option>
                  <option value="USED">Usado</option>
                  <option value="EXPIRED">Expirado</option>
                  <option value="REVOKED">Revogado</option>
                </select>
              </label>
            </FilterBar>

            <DataTable
              columns={columns}
              data={inviteRows.data}
              loading={invitesQuery.isLoading}
              pagination={{
                currentPage: inviteRows.pagination.page,
                totalPages: inviteRows.pagination.totalPages,
                totalItems: inviteRows.pagination.total,
                onPageChange: handlePageChange,
              }}
              actions={(invite) => (
                invite.status === 'PENDING' ? (
                  <button
                    type="button"
                    className="table-link table-link--danger"
                    onClick={() => setInviteToRevoke(invite)}
                  >
                    Revogar
                  </button>
                ) : null
              )}
              getRowKey={(invite) => invite.id}
            />

            {!invitesQuery.isLoading && inviteRows.data.length === 0 ? (
              <EmptyState
                title="Nenhum convite encontrado"
                description="Ajuste os filtros ou emita um novo convite para esta instancia."
                action={
                  <button
                    type="button"
                    className="button button--add"
                    onClick={() => setIsFormModalOpen(true)}
                  >
                    Emitir convite
                  </button>
                }
              />
            ) : null}
          </div>
        </section>

        <section className="panel-card">
          <div className="panel-card__header">
            <div>
              <h2>Codigo de convite</h2>
              <p>Gere um codigo temporario para moradores se cadastrarem sem convite por email.</p>
            </div>
          </div>
          <div className="panel-card__body page-stack">
            {freshCode ? (
              <div className="inline-feedback inline-feedback--success">
                <strong>Codigo gerado:</strong> {freshCode.code}
                <br />
                <span>
                  Valido ate{' '}
                  {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
                    new Date(freshCode.expiresAt),
                  )}
                </span>
              </div>
            ) : activeCodeQuery.data ? (
              <div className="inline-feedback inline-feedback--info">
                <strong>Codigo ativo:</strong> ****{activeCodeQuery.data.codeLast4}
                <br />
                <span>
                  Expira em{' '}
                  {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
                    new Date(activeCodeQuery.data.expiresAt),
                  )}
                </span>
              </div>
            ) : activeCodeQuery.isLoading ? (
              <div className="inline-feedback inline-feedback--info">Verificando codigo ativo...</div>
            ) : (
              <p>Nenhum codigo ativo no momento.</p>
            )}
            <div className="table-actions">
              <button
                type="button"
                className="button button--add"
                onClick={() => void createCodeMutation.mutateAsync()}
                disabled={createCodeMutation.isPending || cancelCodeMutation.isPending}
              >
                {createCodeMutation.isPending ? 'Gerando...' : 'Gerar novo codigo'}
              </button>
              {(activeCodeQuery.data || freshCode) ? (
                <button
                  type="button"
                  className="button button--danger"
                  onClick={() => void cancelCodeMutation.mutateAsync()}
                  disabled={cancelCodeMutation.isPending || createCodeMutation.isPending}
                >
                  {cancelCodeMutation.isPending ? 'Cancelando...' : 'Cancelar codigo ativo'}
                </button>
              ) : null}
            </div>
          </div>
        </section>

        <FormModal
          isOpen={isFormModalOpen}
          onClose={() => setIsFormModalOpen(false)}
          title="Novo convite"
        >
          <InviteForm
            instanceKey={instanceKey}
            onSubmit={async (payload) => {
              await createMutation.mutateAsync(payload);
            }}
            onCancel={() => setIsFormModalOpen(false)}
            isSubmitting={createMutation.isPending}
            error={createMutation.error}
          />
        </FormModal>

        <ConfirmActionModal
          isOpen={Boolean(inviteToRevoke)}
          onCancel={() => setInviteToRevoke(null)}
          onConfirm={async () => {
            if (!inviteToRevoke) {
              return;
            }

            await revokeMutation.mutateAsync(inviteToRevoke.id);
          }}
          title="Revogar convite"
          description={`Tem certeza que deseja revogar o convite de ${inviteToRevoke?.email ?? 'este destinatario'}?`}
          confirmLabel="Revogar"
          variant="danger"
          isLoading={revokeMutation.isPending}
        />
      </div>
    </PermissionGuard>
  );
}
