import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit2, Save, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTenantContext } from '@/app/tenant/tenantContext';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/states/EmptyState';
import { ErrorState } from '@/components/states/ErrorState';
import { getCondoProfile, updateCondoProfile } from '@/modules/condo/services/condoProfile.service.ts';
import type { UpdateCondoProfileRequest } from '@/modules/condo/types.ts';
import { getErrorMessage, isForbiddenError } from '@/services/errors';

const CONDO_PROFILE_QUERY_KEY = (instanceKey: string) => ['condo', 'profile', instanceKey];

export function CondoProfilePage() {
  const { instanceKey } = useTenantContext();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState<UpdateCondoProfileRequest>({});

  const profileQuery = useQuery({
    queryKey: CONDO_PROFILE_QUERY_KEY(instanceKey),
    queryFn: () => getCondoProfile(instanceKey),
    enabled: Boolean(instanceKey),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateCondoProfileRequest) => updateCondoProfile(instanceKey, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONDO_PROFILE_QUERY_KEY(instanceKey) });
      setIsEditing(false);
      setFeedbackMessage('Perfil do condominio atualizado com sucesso.');
    },
  });

  useEffect(() => {
    setIsEditing(false);
    setFeedbackMessage(null);
    setFormData({});
  }, [instanceKey]);

  useEffect(() => {
    if (!profileQuery.data || isEditing) {
      return;
    }

    setFormData({
      name: profileQuery.data.name || '',
      address: profileQuery.data.address || '',
      phone: profileQuery.data.phone || '',
    });
  }, [isEditing, profileQuery.data]);

  const handleEdit = () => {
    if (!profileQuery.data) {
      return;
    }

    setFeedbackMessage(null);
    setIsEditing(true);
    setFormData({
      name: profileQuery.data.name || '',
      address: profileQuery.data.address || '',
      phone: profileQuery.data.phone || '',
    });
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (profileQuery.data) {
      setFormData({
        name: profileQuery.data.name || '',
        address: profileQuery.data.address || '',
        phone: profileQuery.data.phone || '',
      });
    }
  };

  const updateField = (key: keyof UpdateCondoProfileRequest, value: string) => {
    setFormData((currentValue) => ({ ...currentValue, [key]: value }));
  };

  if (profileQuery.error && isForbiddenError(profileQuery.error)) {
    return (
      <PermissionGuard allow={['SINDICO_ADMIN']}>
        <div className="page-stack">
          <PageHeader title="Perfil do condominio" description="Consulte e atualize os dados da instancia." />
          <ErrorState
            title="Acesso negado ao perfil do condominio"
            description="O backend retornou 403 para este modulo tenant."
            code="403"
          />
        </div>
      </PermissionGuard>
    );
  }

  if (profileQuery.error) {
    return (
      <PermissionGuard allow={['SINDICO_ADMIN']}>
        <div className="page-stack">
          <PageHeader title="Perfil do condominio" description="Consulte e atualize os dados da instancia." />
          <ErrorState
            title="Falha ao carregar o perfil"
            description={getErrorMessage(profileQuery.error)}
          />
        </div>
      </PermissionGuard>
    );
  }

  if (!profileQuery.isLoading && !profileQuery.data) {
    return (
      <PermissionGuard allow={['SINDICO_ADMIN']}>
        <div className="page-stack">
          <PageHeader title="Perfil do condominio" description="Consulte e atualize os dados da instancia." />
          <EmptyState
            title="Perfil nao encontrado"
            description="Nao ha dados de perfil disponiveis para esta instancia."
          />
        </div>
      </PermissionGuard>
    );
  }

  return (
    <PermissionGuard allow={['SINDICO_ADMIN']}>
      <div className="page-stack">
        <PageHeader
          title="Perfil do condominio"
          description="Mantenha os dados da instancia atualizados sem sair do tenant ativo."
          badge={profileQuery.isFetching ? 'Atualizando dados' : undefined}
          actions={
            !isEditing ? (
              <button type="button" className="button button--primary" onClick={handleEdit}>
                <Edit2 className="mr-1 inline h-4 w-4" /> Editar
              </button>
            ) : (
              <div className="table-actions">
                <button
                  type="button"
                  className="button button--primary"
                  onClick={() => updateMutation.mutate(formData)}
                  disabled={updateMutation.isPending}
                >
                  <Save className="mr-1 inline h-4 w-4" />
                  {updateMutation.isPending ? 'Salvando...' : 'Salvar'}
                </button>
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={handleCancel}
                  disabled={updateMutation.isPending}
                >
                  <X className="mr-1 inline h-4 w-4" /> Cancelar
                </button>
              </div>
            )
          }
        />

        {feedbackMessage ? (
          <div className="inline-feedback inline-feedback--success">{feedbackMessage}</div>
        ) : null}

        {updateMutation.isError ? (
          <div className="inline-feedback inline-feedback--error">
            {getErrorMessage(updateMutation.error)}
          </div>
        ) : null}

        <section className="panel-card">
          <div className="panel-card__header">
            <div>
              <h2>Dados da instancia</h2>
              <p>Informacoes centrais do condominio usadas em operacao, atendimento e comunicacao.</p>
            </div>
          </div>
          <div className="panel-card__body detail-grid">
            <label className="field">
              <span className="field__label">Nome</span>
              {profileQuery.isLoading ? (
                <div className="skeleton table-loading__line" />
              ) : isEditing ? (
                <input
                  type="text"
                  className="field__input"
                  value={formData.name || ''}
                  onChange={(event) => updateField('name', event.target.value)}
                />
              ) : (
                <div className="detail-section__body">{profileQuery.data?.name || '-'}</div>
              )}
            </label>

            <label className="field">
              <span className="field__label">Telefone</span>
              {profileQuery.isLoading ? (
                <div className="skeleton table-loading__line" />
              ) : isEditing ? (
                <input
                  type="text"
                  className="field__input"
                  value={formData.phone || ''}
                  onChange={(event) => updateField('phone', event.target.value)}
                />
              ) : (
                <div className="detail-section__body">{profileQuery.data?.phone || '-'}</div>
              )}
            </label>

            <label className="field" style={{ gridColumn: '1 / -1' }}>
              <span className="field__label">Endereco</span>
              {profileQuery.isLoading ? (
                <div className="skeleton table-loading__line" />
              ) : isEditing ? (
                <textarea
                  className="field__input composer-panel__input"
                  value={formData.address || ''}
                  onChange={(event) => updateField('address', event.target.value)}
                />
              ) : (
                <div className="detail-section__body">{profileQuery.data?.address || '-'}</div>
              )}
            </label>
          </div>
        </section>
      </div>
    </PermissionGuard>
  );
}
