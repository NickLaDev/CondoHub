import { useEffect, useState } from 'react';

interface AssigneeOption {
  id: string;
  name: string;
}

interface TicketAssignControlProps {
  assignees: AssigneeOption[];
  currentAssigneeId?: string | null;
  onAssign: (userId: string) => Promise<void>;
  isSubmitting?: boolean;
}

export function TicketAssignControl({
  assignees,
  currentAssigneeId,
  onAssign,
  isSubmitting = false,
}: TicketAssignControlProps) {
  const [selectedUserId, setSelectedUserId] = useState(currentAssigneeId ?? '');

  useEffect(() => {
    setSelectedUserId(currentAssigneeId ?? '');
  }, [currentAssigneeId]);

  return (
    <div className="control-card">
      <div className="control-card__copy">
        <h3>Responsavel atual</h3>
        <p>Atribua o ticket a um colaborador de manutencao.</p>
      </div>
      <div className="control-card__actions">
        <select
          className="field__input"
          value={selectedUserId}
          onChange={(event) => setSelectedUserId(event.target.value)}
          disabled={isSubmitting}
        >
          <option value="">Selecionar responsavel</option>
          {assignees.map((assignee) => (
            <option key={assignee.id} value={assignee.id}>
              {assignee.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="button button--primary"
          onClick={() => void onAssign(selectedUserId)}
          disabled={isSubmitting || !selectedUserId || selectedUserId === (currentAssigneeId ?? '')}
        >
          {isSubmitting ? 'Atribuindo...' : 'Atribuir'}
        </button>
      </div>
    </div>
  );
}
