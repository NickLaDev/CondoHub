import { useSearchParams } from 'react-router-dom';
import { FilterBar } from '@/components/filters/FilterBar';
import { ticketStatusOptions } from '@/modules/tickets/helpers';

interface FilterOption {
  id: string;
  label: string;
}

interface TicketFiltersProps {
  units: FilterOption[];
  assignees: FilterOption[];
}

export function TicketFilters({ units, assignees }: TicketFiltersProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentStatus = searchParams.get('status') || '';
  const currentUnitId = searchParams.get('unitId') || '';
  const currentAssignedTo = searchParams.get('assignedTo') || '';
  const isOverdue = searchParams.get('overdue') === 'true';

  const updateParam = (key: string, value: string) => {
    setSearchParams((currentParams) => {
      const nextParams = new URLSearchParams(currentParams);

      if (value) {
        nextParams.set(key, value);
      } else {
        nextParams.delete(key);
      }

      nextParams.set('page', '1');
      return nextParams;
    });
  };

  return (
    <div className="page-stack">
      <FilterBar placeholder="Buscar ticket por texto, categoria ou local..." />

      <div className="toolbar-row">
        <label className="field toolbar-row__field">
          <span className="field__label">Status</span>
          <select
            className="field__input"
            value={currentStatus}
            onChange={(event) => updateParam('status', event.target.value)}
          >
            <option value="">Todos</option>
            {ticketStatusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>

        <label className="field toolbar-row__field">
          <span className="field__label">Unidade</span>
          <select
            className="field__input"
            value={currentUnitId}
            onChange={(event) => updateParam('unitId', event.target.value)}
          >
            <option value="">Todas</option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field toolbar-row__field">
          <span className="field__label">Responsavel</span>
          <select
            className="field__input"
            value={currentAssignedTo}
            onChange={(event) => updateParam('assignedTo', event.target.value)}
          >
            <option value="">Todos</option>
            {assignees.map((assignee) => (
              <option key={assignee.id} value={assignee.id}>
                {assignee.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field toolbar-row__field">
          <span className="field__label">SLA</span>
          <button
            type="button"
            className={`button ${isOverdue ? 'button--danger' : 'button--ghost'}`}
            onClick={() => updateParam('overdue', isOverdue ? '' : 'true')}
          >
            {isOverdue ? 'Apenas overdue' : 'Incluir overdue'}
          </button>
        </label>
      </div>
    </div>
  );
}
