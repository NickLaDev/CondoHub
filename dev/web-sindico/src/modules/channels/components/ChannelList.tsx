import { StatusBadge } from '@/components/feedback/StatusBadge';
import type { Channel } from '@/modules/channels/types';

interface ChannelListProps {
  channels: Channel[];
  selectedChannelId?: string;
  onSelect: (channel: Channel) => void;
}

export function ChannelList({ channels, selectedChannelId, onSelect }: ChannelListProps) {
  if (!channels.length) {
    return <p className="detail-section__body">Nenhum canal cadastrado.</p>;
  }

  return (
    <div className="thread-list">
      {channels.map((channel) => (
        <button
          type="button"
          key={String(channel.id)}
          className={`thread-list__item${String(channel.id) === selectedChannelId ? ' thread-list__item--active' : ''}`}
          onClick={() => onSelect(channel)}
        >
          <div className="thread-list__item-header">
            <strong>{channel.name}</strong>
            <StatusBadge
              status={channel.status === 'archived' || channel.archivedAt ? 'archived' : 'active'}
            />
          </div>
          <p>{channel.description || 'Sem descricao cadastrada.'}</p>
          <span>{channel.visibility === 'PRIVATE' ? 'Canal privado' : 'Canal publico'}</span>
        </button>
      ))}
    </div>
  );
}
