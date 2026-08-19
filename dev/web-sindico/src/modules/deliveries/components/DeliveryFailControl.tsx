import { useState } from 'react';
import { AttachmentUploader } from '@/components/attachments/AttachmentUploader';
import type { FailDeliveryRequest } from '@/modules/deliveries/types';

interface DeliveryFailControlProps {
  instanceKey: string;
  onSubmit: (payload: FailDeliveryRequest) => void;
  isSubmitting?: boolean;
}

export function DeliveryFailControl({
  instanceKey,
  onSubmit,
  isSubmitting = false,
}: DeliveryFailControlProps) {
  const [reason, setReason] = useState('');
  const [evidenceAttachmentId, setEvidenceAttachmentId] = useState('');

  const handlePrepare = () => {
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      return;
    }

    onSubmit({
      reason: trimmedReason,
      evidenceAttachmentId: evidenceAttachmentId || undefined,
    });
  };

  return (
    <div className="control-card">
      <div className="control-card__copy">
        <h3>Registrar falha</h3>
        <p>Motivo obrigatorio antes da confirmacao final.</p>
      </div>
      <div className="page-stack">
        <textarea
          className="field__input"
          rows={3}
          placeholder="Descreva por que a entrega falhou"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
        <AttachmentUploader
          instanceKey={instanceKey}
          multiple={false}
          onChange={(attachmentIds) => setEvidenceAttachmentId(attachmentIds[0] ?? '')}
        />
        <button
          type="button"
          className="button button--danger"
          onClick={handlePrepare}
          disabled={isSubmitting || !reason.trim()}
        >
          Preparar falha
        </button>
      </div>
    </div>
  );
}
