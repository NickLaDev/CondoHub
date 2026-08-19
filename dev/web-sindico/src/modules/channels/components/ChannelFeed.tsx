import { AttachmentLinks } from '@/components/attachments/AttachmentLinks';
import { ModerationActions } from '@/modules/channels/components/ModerationActions';
import type { ChannelPost } from '@/modules/channels/types';

function getPostBody(post: ChannelPost) {
  return post.body ?? post.text ?? '';
}

interface ChannelFeedProps {
  instanceKey: string;
  posts: ChannelPost[];
  onOpenComments: (post: ChannelPost) => void;
  onDeletePost: (post: ChannelPost) => void;
  onSilenceUser: (post: ChannelPost) => void;
  onRemoveContent?: (post: ChannelPost) => void;
}

export function ChannelFeed({
  instanceKey,
  posts,
  onOpenComments,
  onDeletePost,
  onSilenceUser,
  onRemoveContent,
}: ChannelFeedProps) {
  return (
    <div className="page-stack">
      {posts.map((post) => (
        <article key={post.id} className="feed-card">
          <div className="feed-card__header">
            <strong>{post.authorName ?? post.author ?? 'Morador'}</strong>
            <span>{new Date(post.createdAt).toLocaleString('pt-BR')}</span>
          </div>
          <p>{getPostBody(post)}</p>
          {post.attachmentIds?.length ? (
            <AttachmentLinks instanceKey={instanceKey} attachmentIds={post.attachmentIds} />
          ) : null}
          <div className="feed-card__actions">
            <button type="button" className="table-link" onClick={() => onOpenComments(post)}>
              Ver comentarios
            </button>
            <ModerationActions
              onDeletePost={() => onDeletePost(post)}
              onSilenceUser={() => onSilenceUser(post)}
              onRemoveContent={onRemoveContent ? () => onRemoveContent(post) : undefined}
            />
          </div>
        </article>
      ))}
    </div>
  );
}
