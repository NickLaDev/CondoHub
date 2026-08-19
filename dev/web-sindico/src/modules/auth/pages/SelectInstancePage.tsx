import { useState } from 'react';
import { ArrowLeft, Building2, LoaderCircle } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { CondoHubLogo } from '@/components/brand/CondoHubLogo';
import type { InstanceSelectionOption } from '@/modules/auth/types';
import { useAuthStore } from '@/store/auth';

function getInstanceName(option: InstanceSelectionOption) {
  return option.instanceName?.trim() || option.instanceKey;
}

function formatRole(role: string) {
  return role.replaceAll('_', ' ');
}

export function SelectInstancePage() {
  const navigate = useNavigate();
  const currentInstanceKey = useAuthStore((state) => state.currentInstanceKey);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const pendingInstanceSelection = useAuthStore((state) => state.pendingInstanceSelection);
  const selectInstance = useAuthStore((state) => state.selectInstance);
  const clearPendingInstanceSelection = useAuthStore(
    (state) => state.clearPendingInstanceSelection,
  );
  const isSubmitting = useAuthStore((state) => state.isSubmitting);
  const authError = useAuthStore((state) => state.authError);
  const clearAuthError = useAuthStore((state) => state.clearAuthError);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);

  async function handleSelect(option: InstanceSelectionOption) {
    clearAuthError();
    setSelectedInstanceId(option.instanceId);

    try {
      const instanceKey = await selectInstance(option.instanceId);
      navigate(`/${instanceKey}/dashboard`, { replace: true });
    } catch {
      setSelectedInstanceId(null);
    }
  }

  function handleBackToLogin() {
    clearPendingInstanceSelection();
    navigate('/', { replace: true });
  }

  if (isAuthenticated && currentInstanceKey) {
    return <Navigate to={`/${currentInstanceKey}/dashboard`} replace />;
  }

  if (!pendingInstanceSelection) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="entry-screen select-instance-screen">
      <div className="entry-screen__panel select-instance-panel">
        <CondoHubLogo />

        <div className="entry-screen__copy">
          <h1>Escolha seu condomínio</h1>
          <p>
            Sua conta possui acesso a mais de um condomínio. Selecione a instância
            que deseja administrar agora.
          </p>
        </div>

        {authError ? (
          <div className="inline-feedback inline-feedback--error" role="alert">
            {authError}
          </div>
        ) : null}

        {pendingInstanceSelection.options.length > 0 ? (
          <div className="instance-selection-list">
            {pendingInstanceSelection.options.map((option) => {
              const isSelected = selectedInstanceId === option.instanceId;
              const isLoading = isSubmitting && isSelected;

              return (
                <button
                  key={option.instanceId}
                  type="button"
                  className="instance-selection-card"
                  onClick={() => void handleSelect(option)}
                  disabled={isSubmitting}
                >
                  <span className="instance-selection-card__icon" aria-hidden="true">
                    <Building2 size={20} />
                  </span>

                  <span className="instance-selection-card__body">
                    <strong>{getInstanceName(option)}</strong>
                    {option.unitLabel ? <small>{option.unitLabel}</small> : null}
                    {option.roles?.length ? (
                      <span className="instance-selection-card__roles">
                        {option.roles.map((role) => (
                          <span key={role} className="role-pill">
                            {formatRole(role)}
                          </span>
                        ))}
                      </span>
                    ) : null}
                  </span>

                  <span className="instance-selection-card__action">
                    {isLoading ? <LoaderCircle size={18} className="spin" /> : 'Selecionar'}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="inline-feedback inline-feedback--error" role="alert">
            Nenhum condomínio disponível para esta conta.
          </div>
        )}

        <button
          type="button"
          className="button button--ghost button--full"
          onClick={handleBackToLogin}
          disabled={isSubmitting}
        >
          <ArrowLeft size={18} />
          Voltar ao login
        </button>
      </div>
    </div>
  );
}
