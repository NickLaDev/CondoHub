import { EmptyState } from '@/components/states/EmptyState';
import type { TurnInfo } from '@/modules/turns/types';

interface TurnHistoryProps {
  history: TurnInfo[];
}

function formatTurnDate(value: string | null | undefined) {
  if (!value) {
    return 'Sem registro';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function TurnHistory({ history }: TurnHistoryProps) {
  if (history.length === 0) {
    return (
      <EmptyState
        title="Historico indisponivel"
        description="O backend ainda nao retornou um historico resumido de turnos para esta instancia."
      />
    );
  }

  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            <th>Responsavel</th>
            <th>Inicio</th>
            <th>Fim</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {history.map((turn) => (
            <tr key={turn.id}>
              <td>{turn.actorName ?? 'Nao informado'}</td>
              <td>{formatTurnDate(turn.startedAt)}</td>
              <td>{formatTurnDate(turn.endedAt)}</td>
              <td>{turn.isOpen ? 'Aberto' : 'Encerrado'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
