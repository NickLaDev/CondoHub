import { useSearchParams } from 'react-router-dom';
import { FilterBar } from '@/components/filters/FilterBar';

interface UnitOption {
  id: string;
  label: string;
}

interface LogsFiltersProps {
  units: UnitOption[];
}

export function LogsFilters({ units }: LogsFiltersProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const unitId = searchParams.get('unitId') || '';
  const action = searchParams.get('action') || '';
  const actor = searchParams.get('actor') || '';
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';

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

  return (
    <div className="page-stack">
      <FilterBar placeholder="Buscar por texto livre, entidade ou request id..." />

      <div className="toolbar-row">
        <label className="field toolbar-row__field">
          <span className="field__label">Unidade</span>
          <select
            className="field__input"
            value={unitId}
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
          <span className="field__label">Acao</span>
          <input
            className="field__input"
            type="text"
            value={action}
            onChange={(event) => updateParam('action', event.target.value)}
            placeholder="Ex.: TICKET_CREATED"
          />
        </label>

        <label className="field toolbar-row__field">
          <span className="field__label">Ator</span>
          <input
            className="field__input"
            type="text"
            value={actor}
            onChange={(event) => updateParam('actor', event.target.value)}
            placeholder="Nome ou id do ator"
          />
        </label>

        <label className="field toolbar-row__field">
          <span className="field__label">Inicio</span>
          <input
            className="field__input"
            type="date"
            value={startDate}
            onChange={(event) => updateParam('startDate', event.target.value)}
          />
        </label>

        <label className="field toolbar-row__field">
          <span className="field__label">Fim</span>
          <input
            className="field__input"
            type="date"
            value={endDate}
            onChange={(event) => updateParam('endDate', event.target.value)}
          />
        </label>
      </div>
    </div>
  );
}
