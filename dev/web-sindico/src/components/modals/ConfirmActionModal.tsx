import { X } from 'lucide-react';
import { clsx } from 'clsx';

interface ConfirmActionModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const variantStyles = {
  danger: {
    confirm: 'button button--danger',
    icon: 'confirm-modal__icon--danger',
  },
  warning: {
    confirm: 'button button--warning',
    icon: 'confirm-modal__icon--warning',
  },
  info: {
    confirm: 'button button--primary',
    icon: 'confirm-modal__icon--info',
  },
};

export function ConfirmActionModal({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmActionModalProps) {
  if (!isOpen) return null;

  const styles = variantStyles[variant];

  return (
    <div className="overlay-shell" role="dialog" aria-modal="true" aria-label={title}>
      <div className="overlay-shell__backdrop" onClick={onCancel} />
      <div className="modal modal--sm">
        <div className="modal__header">
          <h3>{title}</h3>
          <button
            type="button"
            className="icon-button"
            aria-label="Fechar confirmaÃ§Ã£o"
            onClick={onCancel}
            disabled={isLoading}
          >
            <X size={18} />
          </button>
        </div>
        <div className="modal__content">
          <div className="confirm-modal">
            <div className={clsx('confirm-modal__icon', styles.icon)}>
              <X size={20} />
            </div>
            <p>{description}</p>
          </div>
          <div className="confirm-modal__actions">
            <button
              type="button"
              className={clsx(styles.confirm, isLoading && 'is-disabled')}
              onClick={onConfirm}
              disabled={isLoading}
            >
              {isLoading ? 'Processando...' : confirmLabel}
            </button>
            <button
              type="button"
              className="button button--ghost"
              onClick={onCancel}
              disabled={isLoading}
            >
              {cancelLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
