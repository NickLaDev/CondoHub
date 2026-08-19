import { X } from 'lucide-react';
import type { ReactNode } from 'react';

interface FormModalProps {
  isOpen: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'modal--sm',
  md: 'modal--md',
  lg: 'modal--lg',
  xl: 'modal--xl',
};

export function FormModal({
  isOpen,
  title,
  children,
  onClose,
  size = 'md',
}: FormModalProps) {
  if (!isOpen) return null;

  return (
    <div className="overlay-shell" role="dialog" aria-modal="true" aria-label={title}>
      <div className="overlay-shell__backdrop" onClick={onClose} />
      <div className={`modal ${sizeClasses[size]}`}>
        <div className="modal__header">
          <h3>{title}</h3>
          <button
            type="button"
            className="icon-button modal__close"
            aria-label="Fechar modal"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        <div className="modal__content">{children}</div>
      </div>
    </div>
  );
}
