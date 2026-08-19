import { useState } from 'react';
import { AttachmentLinks } from '@/components/attachments/AttachmentLinks';
import { AttachmentUploader } from '@/components/attachments/AttachmentUploader';
import { getErrorMessage } from '@/services/errors';
import { formatTicketDateTime } from '@/modules/tickets/helpers';
import type { TicketMessage } from '@/modules/tickets/types';

interface TicketMessagesProps {
  instanceKey: string;
  messages: TicketMessage[];
  onSendMessage: (payload: { message: string; attachmentId?: string }) => Promise<void>;
  isSubmitting?: boolean;
  error?: unknown;
}

export function TicketMessages({
  instanceKey,
  messages,
  onSendMessage,
  isSubmitting = false,
  error,
}: TicketMessagesProps) {
  const [message, setMessage] = useState('');
  const [attachmentIds, setAttachmentIds] = useState<string[]>([]);

  const handleSend = async () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      return;
    }

    await onSendMessage({
      message: trimmedMessage,
      attachmentId: attachmentIds[0],
    });
    setMessage('');
    setAttachmentIds([]);
  };

  return (
    <div className="page-stack">
      {messages.length === 0 ? (
        <div className="table-empty">
          Nenhuma mensagem registrada para este ticket.
        </div>
      ) : (
        <div className="message-list">
          {messages.map((item) => (
            <article key={item.id} className="message-bubble message-bubble--resident">
              <div className="message-bubble__header">
                <strong>{item.authorName ?? 'Equipe do condominio'}</strong>
                <span>{formatTicketDateTime(item.createdAt)}</span>
              </div>
              <p>{item.message}</p>
              {item.authorRole ? <span>{item.authorRole}</span> : null}
              {item.attachmentIds.length > 0 ? (
                <AttachmentLinks
                  instanceKey={instanceKey}
                  attachmentIds={item.attachmentIds}
                />
              ) : null}
            </article>
          ))}
        </div>
      )}

      <div className="composer-panel">
        {error ? (
          <div className="inline-feedback inline-feedback--error">
            {getErrorMessage(error)}
          </div>
        ) : null}

        <textarea
          className="field__input composer-panel__input"
          rows={4}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Responder ticket..."
        />

        <AttachmentUploader
          instanceKey={instanceKey}
          multiple={false}
          onChange={setAttachmentIds}
        />

        <div className="composer-panel__actions">
          <button
            type="button"
            className="button button--primary"
            onClick={() => void handleSend()}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Enviando...' : 'Enviar mensagem'}
          </button>
        </div>
      </div>
    </div>
  );
}
