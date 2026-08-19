import { X } from 'lucide-react';
import type { ReactNode } from 'react';

interface DrawerDetailProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
}

export function DrawerDetail({
  isOpen,
  title,
  description,
  onClose,
  children,
  actions,
}: DrawerDetailProps) {
  if (!isOpen) return null;

  return (
    <div className="overlay-shell" role="dialog" aria-modal="true" aria-label={title}>
      <div className="overlay-shell__backdrop" onClick={onClose} />
      <div className="drawer-detail">
        <div className="drawer-detail__header">
          <div className="drawer-detail__copy">
            <h2>{title}</h2>
            {description ? <p>{description}</p> : null}
          </div>
          <button type="button" className="icon-button" aria-label="Fechar detalhe" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="drawer-detail__content">{children}</div>
        {actions ? <div className="drawer-detail__actions">{actions}</div> : null}
      </div>
    </div>
  );
}
