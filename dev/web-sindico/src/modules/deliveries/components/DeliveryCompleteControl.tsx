import { useState } from 'react';
import { AttachmentUploader } from '@/components/attachments/AttachmentUploader';
import type { CompleteDeliveryRequest } from '@/modules/deliveries/types';

interface DeliveryCompleteControlProps {
  instanceKey: string;
  onSubmit: (payload: CompleteDeliveryRequest) => Promise<void>;
  isSubmitting?: boolean;
}

export function DeliveryCompleteControl({
  instanceKey,
  onSubmit,
  isSubmitting = false,
}: DeliveryCompleteControlProps) {
  const [qrToken, setQrToken] = useState('');
  const [deliveredToName, setDeliveredToName] = useState('');
  const [evidenceAttachmentId, setEvidenceAttachmentId] = useState('');

  const handleSubmit = async () => {
    const trimmedQrToken = qrToken.trim();
    if (!trimmedQrToken) {
      return;
    }

    await onSubmit({
      qrToken: trimmedQrToken,
      deliveredToName: deliveredToName.trim() || undefined,
      evidenceAttachmentId: evidenceAttachmentId || undefined,
    });

    setQrToken('');
    setDeliveredToName('');
    setEvidenceAttachmentId('');
  };

  return (
    <div className="control-card">
      <div className="control-card__copy">
        <h3>Concluir entrega</h3>
        <p>Fluxo preparado para QR forte, sem inventar contrato fora do backend.</p>
      </div>
      <div className="page-stack">
        <input
          className="field__input"
          type="text"
          placeholder="QR token forte"
          value={qrToken}
          onChange={(event) => setQrToken(event.target.value)}
        />
        <input
          className="field__input"
          type="text"
          placeholder="Nome de quem recebeu (opcional)"
          value={deliveredToName}
          onChange={(event) => setDeliveredToName(event.target.value)}
        />
        <AttachmentUploader
          instanceKey={instanceKey}
          multiple={false}
          onChange={(attachmentIds) => setEvidenceAttachmentId(attachmentIds[0] ?? '')}
        />
        <button
          type="button"
          className="button button--primary"
          onClick={() => void handleSubmit()}
          disabled={isSubmitting || !qrToken.trim()}
        >
          {isSubmitting ? 'Concluindo...' : 'Concluir com QR'}
        </button>
      </div>
    </div>
  );
}
