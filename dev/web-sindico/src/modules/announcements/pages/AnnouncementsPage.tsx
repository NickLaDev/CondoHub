import { useEffect, useState } from 'react';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useTenantContext } from '@/app/tenant/tenantContext';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable } from '@/components/data/DataTable';
import { DrawerDetail } from '@/components/drawer/DrawerDetail';
import { ConfirmActionModal } from '@/components/modals/ConfirmActionModal';
import { StatusBadge } from '@/components/feedback/StatusBadge';
import { FilterBar } from '@/components/filters/FilterBar';
import { FormModal } from '@/components/modals/FormModal';
import { EmptyState } from '@/components/states/EmptyState';
import { ErrorState } from '@/components/states/ErrorState';
import { AnnouncementForm } from '@/modules/announcements/components/AnnouncementForm';
import { AnnouncementDetail } from '@/modules/announcements/components/AnnouncementDetail';
import {
  archiveAnnouncement,
  createAnnouncement,
  getAnnouncements,
  updateAnnouncement,
} from '@/modules/announcements/services/announcements.service';
import type { Announcement } from '@/modules/announcements/types';
import { getErrorMessage, isForbiddenError } from '@/services/errors';
import { createEmptyPaginatedResponse } from '@/services/pagination';

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function isArchived(announcement: Announcement) {
  return Boolean(announcement.archived || announcement.archivedAt);
}

export function AnnouncementsPage() {
  const { instanceKey } = useTenantContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [viewAnnouncement, setViewAnnouncement] = useState<Announcement | null>(null);
  const [archiveAnnouncementItem, setArchiveAnnouncementItem] = useState<Announcement | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const page = parseInt(searchParams.get('page') || '1', 10);
  const search = searchParams.get('search') || '';
  const archived = searchParams.get('archived') === 'true';
  const requireAck = searchParams.get('requireAck') === 'true';

  useEffect(() => {
    setFeedbackMessage(null);
    setIsCreateModalOpen(false);
    setSelectedAnnouncement(null);
    setViewAnnouncement(null);
    setArchiveAnnouncementItem(null);
  }, [instanceKey]);

  const announcementsQuery = useQuery({
    queryKey: ['announcements', instanceKey, page, search, archived, requireAck],
    queryFn: () =>
      getAnnouncements(instanceKey, {
        page,
        limit: 10,
        search: search || undefined,
        archived: archived ? true : undefined,
        requireAck: requireAck ? true : undefined,
      }),
    enabled: !!instanceKey,
    placeholderData: keepPreviousData,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => createAnnouncement(instanceKey, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements', instanceKey] });
      setIsCreateModalOpen(false);
      setSelectedAnnouncement(null);
      setFeedbackMessage('Comunicado criado com sucesso.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      updateAnnouncement(instanceKey, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements', instanceKey] });
      setSelectedAnnouncement(null);
      setFeedbackMessage('Comunicado atualizado com sucesso.');
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => archiveAnnouncement(instanceKey, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements', instanceKey] });
      setArchiveAnnouncementItem(null);
      setViewAnnouncement(null);
      setFeedbackMessage('Comunicado arquivado com sucesso.');
    },
  });

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(newPage));
    setSearchParams(params);
  };

  const handleSearchChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value.trim()) {
      params.set('search', value.trim());
    } else {
      params.delete('search');
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const handleToggleArchived = () => {
    const params = new URLSearchParams(searchParams);
    if (archived) {
      params.delete('archived');
    } else {
      params.set('archived', 'true');
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const handleToggleRequireAck = () => {
    const params = new URLSearchParams(searchParams);
    if (requireAck) {
      params.delete('requireAck');
    } else {
      params.set('requireAck', 'true');
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const handleCreate = async (payload: any) => {
    await createMutation.mutateAsync(payload);
  };

  const handleUpdate = async (payload: any) => {
    if (!selectedAnnouncement) return;
    await updateMutation.mutateAsync({ id: selectedAnnouncement.id, data: payload });
  };

  const handleArchive = async () => {
    if (!archiveAnnouncementItem) return;
    await archiveMutation.mutateAsync(archiveAnnouncementItem.id);
  };

  if (announcementsQuery.error && isForbiddenError(announcementsQuery.error)) {
    return (
      <PermissionGuard allow={['SINDICO_ADMIN']}>
        <div className="page-stack">
          <PageHeader title="Mural" description="Gerencie comunicados oficiais do condomÃ­nio." />
          <ErrorState
            title="Acesso negado ao mural"
            description="O backend retornou 403 para este mÃ³dulo tenant."
            code="403"
          />
        </div>
      </PermissionGuard>
    );
  }

  if (announcementsQuery.error) {
    const text = getErrorMessage(announcementsQuery.error);
    if (isForbiddenError(announcementsQuery.error)) {
      return (
        <div className="page-stack">
          <PageHeader title="Mural" description="Sem permissão" />
          <div className="rounded-md bg-yellow-50 p-4 text-yellow-800">Acesso negado (403)</div>
        </div>
      );
    }
    return (
      <div className="page-stack">
        <PageHeader title="Mural" description="Erro" />
        <div className="rounded-md bg-red-50 p-4 text-red-700">{text}</div>
      </div>
    );
  }

  const data = announcementsQuery.data
    ?? createEmptyPaginatedResponse<Announcement>({
      page,
      limit: 10,
    });

  const columns = [
    { key: 'title', header: 'Título' },
    { key: 'body', header: 'Corpo', render: (value: string) => <span>{String(value).slice(0, 80)}...</span> },
    {
      key: 'requireAck',
      header: 'Requer Ack',
      render: (value: boolean) => (
        <StatusBadge
          status={value ? 'info' : 'neutral'}
          label={value ? 'Exige confirmação' : 'Opcional'}
        />
      ),
    },
    {
      key: 'archived',
      header: 'Status',
      render: (_value: boolean, item: Announcement) => (
        <StatusBadge status={isArchived(item) ? 'archived' : 'active'} />
      ),
    },
    {
      key: 'createdAt',
      header: 'Criado em',
      render: (value: string) => formatDateTime(value),
    },
  ];

  return (
    <PermissionGuard allow={['SINDICO_ADMIN']}><div className="page-stack">
      <PageHeader title="Mural" description="Gerencie comunicados oficiais do condomínio." actions={
        <button
          type="button"
          className="button button--add"
          onClick={() => setIsCreateModalOpen(true)}
        >
          <Plus size={16} /> Novo comunicado
        </button>
      } />

      {feedbackMessage ? (
        <div className="inline-feedback inline-feedback--success">{feedbackMessage}</div>
      ) : null}

      <section className="panel-card panel-card__body">
        <FilterBar placeholder="Buscar no mural..." onSearchChange={handleSearchChange}>
          <button
            type="button"
            className={`button ${archived ? 'button--primary' : 'button--ghost'}`}
            onClick={handleToggleArchived}
          >
            {archived ? 'Mostrar ativos' : 'Mostrar arquivados'}
          </button>
          <button
            type="button"
            className={`button ${requireAck ? 'button--primary' : 'button--ghost'}`}
            onClick={handleToggleRequireAck}
          >
            {requireAck ? 'Todos' : 'Apenas com confirmacao'}
          </button>
        </FilterBar>

        <div>
          <DataTable
            columns={columns}
            data={data.data}
            loading={announcementsQuery.isFetching}
            emptyMessage="Nenhum comunicado encontrado"
            actions={(item: Announcement) => (
              <div className="table-actions">
                <button type="button" className="table-link" onClick={() => setViewAnnouncement(item)}>
                  Detalhes
                </button>
                <button type="button" className="table-link" onClick={() => setSelectedAnnouncement(item)}>
                  Editar
                </button>
                <button
                  type="button"
                  className="table-link table-link--danger"
                  onClick={() => setArchiveAnnouncementItem(item)}
                >
                  Arquivar
                </button>
              </div>
            )}
            pagination={{
              currentPage: data.pagination.page,
              totalPages: data.pagination.totalPages,
              totalItems: data.pagination.total,
              onPageChange: handlePageChange,
            }}
          />
        </div>
      </section>

      <FormModal
        isOpen={isCreateModalOpen || !!selectedAnnouncement}
        onClose={() => {
          setIsCreateModalOpen(false);
          setSelectedAnnouncement(null);
        }}
        title={selectedAnnouncement ? 'Editar Comunicado' : 'Novo Comunicado'}
      >
        <AnnouncementForm
          instanceKey={instanceKey}
          announcement={selectedAnnouncement || undefined}
          onSubmit={selectedAnnouncement ? handleUpdate : handleCreate}
          onCancel={() => {
            setIsCreateModalOpen(false);
            setSelectedAnnouncement(null);
          }}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
          error={createMutation.error || updateMutation.error}
        />
      </FormModal>

      <ConfirmActionModal
        isOpen={!!archiveAnnouncementItem}
        title="Arquivar comunicado"
        description="Tem certeza de que deseja arquivar este comunicado?"
        onConfirm={handleArchive}
        onCancel={() => setArchiveAnnouncementItem(null)}
        isLoading={archiveMutation.isPending}
      />

      {viewAnnouncement ? (
        <DrawerDetail isOpen={!!viewAnnouncement} title="Detalhes do Comunicado" onClose={() => setViewAnnouncement(null)}>
          <AnnouncementDetail instanceKey={instanceKey} announcement={viewAnnouncement} />
        </DrawerDetail>
      ) : null}
    </div></PermissionGuard>
  );
}
