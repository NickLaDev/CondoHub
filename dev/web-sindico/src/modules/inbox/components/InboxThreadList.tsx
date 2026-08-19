import { StatusBadge } from '@/components/feedback/StatusBadge';
import { getInboxStatusBadge, getInboxThreadUnitLabel, formatInboxDateTime } from '@/modules/inbox/helpers';
import type { InboxThread } from '@/modules/inbox/types';

interface InboxThreadListProps {
  threads: InboxThread[];
  selectedThreadId?: string;
  onSelect: (thread: InboxThread) => void;
}

export function InboxThreadList({
  threads,
  selectedThreadId,
  onSelect,
}: InboxThreadListProps) {
  if (!threads.length) {
    return null;
  }

  return (
    <div className="thread-list">
      {threads.map((thread) => {
        const badge = getInboxStatusBadge(thread.status);

        return (
          <button
            key={thread.id}
            type="button"
            className={`thread-list__item${thread.id === selectedThreadId ? ' thread-list__item--active' : ''}`}
            onClick={() => onSelect(thread)}
          >
            <div className="thread-list__item-header">
              <strong>{getInboxThreadUnitLabel(thread)}</strong>
              <StatusBadge status={badge.status} label={badge.label} />
            </div>
            <p>{thread.subject ?? thread.lastMessage ?? 'Sem assunto informado.'}</p>
            <span>{formatInboxDateTime(thread.lastMessageAt ?? thread.updatedAt)}</span>
          </button>
        );
      })}
    </div>
  );
}
