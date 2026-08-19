import { useEffect, useState } from 'react';

interface DeliveryAssignControlProps {
  couriers: Array<{ id: string; name: string }>;
  currentCourierId?: string | null;
  onAssign: (userId: string) => Promise<void>;
  isSubmitting?: boolean;
}

export function DeliveryAssignControl({
  couriers,
  currentCourierId,
  onAssign,
  isSubmitting = false,
}: DeliveryAssignControlProps) {
  const [selectedCourierId, setSelectedCourierId] = useState(currentCourierId ?? '');

  useEffect(() => {
    setSelectedCourierId(currentCourierId ?? '');
  }, [currentCourierId]);

  return (
    <div className="control-card">
      <div className="control-card__copy">
        <h3>Distribuicao</h3>
        <p>Atribua um entregador para sair com a encomenda.</p>
      </div>
      <div className="control-card__actions">
        <select
          className="field__input"
          value={selectedCourierId}
          onChange={(event) => setSelectedCourierId(event.target.value)}
          disabled={isSubmitting}
        >
          <option value="">Selecionar entregador</option>
          {couriers.map((courier) => (
            <option key={courier.id} value={courier.id}>
              {courier.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="button button--primary"
          disabled={isSubmitting || !selectedCourierId || selectedCourierId === (currentCourierId ?? '')}
          onClick={() => void onAssign(selectedCourierId)}
        >
          {isSubmitting ? 'Atribuindo...' : 'Atribuir'}
        </button>
      </div>
    </div>
  );
}
