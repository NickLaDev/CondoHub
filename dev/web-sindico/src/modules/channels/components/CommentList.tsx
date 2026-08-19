import type { ChannelComment } from '@/modules/channels/types';

interface CommentListProps {
  comments: ChannelComment[];
  onEditComment?: (comment: ChannelComment) => void;
}

export function CommentList({ comments, onEditComment }: CommentListProps) {
  if (comments.length === 0) {
    return <p className="detail-section__body">Sem comentarios ainda.</p>;
  }

  return (
    <div className="message-list">
      {comments.map((comment) => (
        <article key={comment.id} className="message-bubble message-bubble--resident">
          <div className="message-bubble__header">
            <strong>{comment.authorName ?? comment.author ?? 'Morador'}</strong>
            <span>{new Date(comment.createdAt).toLocaleString('pt-BR')}</span>
            {onEditComment ? (
              <button
                type="button"
                className="table-link"
                onClick={() => onEditComment(comment)}
              >
                Editar
              </button>
            ) : null}
          </div>
          <p>{comment.body ?? comment.text ?? ''}</p>
        </article>
      ))}
    </div>
  );
}
