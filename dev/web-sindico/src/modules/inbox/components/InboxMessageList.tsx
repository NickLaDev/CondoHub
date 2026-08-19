import { AttachmentLinks } from '@/components/attachments/AttachmentLinks';
import {
  formatInboxDateTime,
  getInboxMessageBody,
  isInboxMessageFromAdmin,
} from '@/modules/inbox/helpers';
import type { InboxMessage } from '@/modules/inbox/types';

interface InboxMessageListProps {
  instanceKey: string;
  messages: InboxMessage[];
}

export function InboxMessageList({ instanceKey, messages }: InboxMessageListProps) {
  if (!messages.length) {
    return null;
  }

  return (
    <div className="message-list">
      {messages.map((message) => {
        const fromAdmin = isInboxMessageFromAdmin(message);

        return (
          <article
            key={message.id}
            className={`message-bubble${fromAdmin ? ' message-bubble--admin' : ' message-bubble--resident'}`}
          >
            <div className="message-bubble__header">
              <strong>{message.authorName ?? message.sender ?? (fromAdmin ? 'AdministraÃ§Ã£o' : 'Morador')}</strong>
              <span>{formatInboxDateTime(message.createdAt)}</span>
            </div>
            <p>{getInboxMessageBody(message)}</p>
            {message.attachmentIds?.length ? (
              <AttachmentLinks instanceKey={instanceKey} attachmentIds={message.attachmentIds} />
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
