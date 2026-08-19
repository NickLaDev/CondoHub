import { StatusBadge } from '@/components/feedback/StatusBadge';
import type { TurnSnapshot } from '@/modules/turns/types';

interface TurnStatusCardProps {
  snapshot: TurnSnapshot;
  onStart: () => Promise<void>;
  onEnd: () => Promise<void>;
  isStarting?: boolean;
  isEnding?: boolean;
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

export function TurnStatusCard({
  snapshot,
  onStart,
  onEnd,
  isStarting = false,
  isEnding = false,
}: TurnStatusCardProps) {
  const hasOpenTurn = Boolean(snapshot.currentTurn?.isOpen);
  const canStart = snapshot.unavailable || !hasOpenTurn;
  const canEnd = snapshot.unavailable || hasOpenTurn;

  return (
    <section className="panel-card">
      <div className="panel-card__header">
        <div>
          <h2>Estado do turno</h2>
          <p>Use a fila de entregas como apoio e ajuste o turno sem sair da rotina operacional.</p>
        </div>
        <StatusBadge
          status={hasOpenTurn ? 'active' : snapshot.unavailable ? 'warning' : 'neutral'}
          label={hasOpenTurn ? 'Turno aberto' : snapshot.unavailable ? 'Estado parcial' : 'Sem turno aberto'}
        />
      </div>

      <div className="panel-card__body page-stack">
        {snapshot.currentTurn ? (
          <div className="detail-list">
            <div className="detail-list__item">
              <strong>Responsavel</strong>
              <span>{snapshot.currentTurn.actorName ?? 'Nao informado'}</span>
            </div>
            <div className="detail-list__item">
              <strong>Inicio</strong>
              <span>{formatTurnDate(snapshot.currentTurn.startedAt)}</span>
            </div>
            <div className="detail-list__item">
              <strong>Fim</strong>
              <span>{formatTurnDate(snapshot.currentTurn.endedAt)}</span>
            </div>
          </div>
        ) : (
          <div className="table-empty">
            {snapshot.unavailable
              ? 'O backend nao publicou leitura completa do turno. As acoes continuam disponiveis e a API validara conflitos.'
              : 'Nenhum turno aberto retornado neste momento.'}
          </div>
        )}

        <div className="toolbar-row">
          {canStart ? (
            <button
              type="button"
              className="button button--primary"
              onClick={() => void onStart()}
              disabled={isStarting}
            >
              {isStarting ? 'Iniciando...' : 'Iniciar turno'}
            </button>
          ) : null}

          {canEnd ? (
            <button
              type="button"
              className="button button--danger"
              onClick={() => void onEnd()}
              disabled={isEnding}
            >
              {isEnding ? 'Encerrando...' : 'Encerrar turno'}
            </button>
          ) : null}
        </div>

        <div className="inline-feedback inline-feedback--info">
          Fila vinculada ao turno: {snapshot.queueDeliveries.length} entrega(s).
        </div>
      </div>
    </section>
  );
}
