import { useState } from 'react';
import { AttachmentUploader } from '@/components/attachments/AttachmentUploader';

interface InboxComposerProps {
  instanceKey: string;
  onSend: (payload: { message: string; attachmentIds: string[] }) => Promise<void>;
  isSubmitting?: boolean;
}

export function InboxComposer({
  instanceKey,
  onSend,
  isSubmitting = false,
}: InboxComposerProps) {
  const [message, setMessage] = useState('');
  const [attachmentIds, setAttachmentIds] = useState<string[]>([]);

  const handleSend = async () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      return;
    }

    await onSend({
      message: trimmedMessage,
      attachmentIds,
    });

    setMessage('');
    setAttachmentIds([]);
  };

  return (
    <div className="composer-panel">
      <textarea
        className="field__input composer-panel__input"
        rows={4}
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder="Responder atendimento da unidade..."
      />

      <AttachmentUploader
        instanceKey={instanceKey}
        multiple
        onChange={setAttachmentIds}
      />

      <div className="composer-panel__actions">
        <button
          type="button"
          className="button button--primary"
          onClick={() => void handleSend()}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Enviando...' : 'Enviar resposta'}
        </button>
      </div>
    </div>
  );
}
