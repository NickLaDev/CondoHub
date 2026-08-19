import { useEffect, useState } from 'react';
import { ticketStatusOptions } from '@/modules/tickets/helpers';
import type { TicketStatus } from '@/modules/tickets/types';

interface TicketStatusControlProps {
  value: TicketStatus;
  onChange: (status: TicketStatus) => Promise<void>;
  isSubmitting?: boolean;
}

export function TicketStatusControl({
  value,
  onChange,
  isSubmitting = false,
}: TicketStatusControlProps) {
  const [selectedStatus, setSelectedStatus] = useState(value);

  useEffect(() => {
    setSelectedStatus(value);
  }, [value]);

  return (
    <div className="control-card">
      <div className="control-card__copy">
        <h3>Status do ticket</h3>
        <p>Atualize o andamento sem sair do detalhe.</p>
      </div>
      <div className="control-card__actions">
        <select
          className="field__input"
          value={selectedStatus}
          onChange={(event) => setSelectedStatus(event.target.value)}
          disabled={isSubmitting}
        >
          {ticketStatusOptions.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="button button--primary"
          onClick={() => void onChange(selectedStatus)}
          disabled={isSubmitting || selectedStatus === value}
        >
          {isSubmitting ? 'Atualizando...' : 'Salvar status'}
        </button>
      </div>
    </div>
  );
}
