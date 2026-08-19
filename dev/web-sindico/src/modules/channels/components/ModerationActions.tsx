interface ModerationActionsProps {
  onDeletePost: () => void;
  onSilenceUser: () => void;
  onRemoveContent?: () => void;
}

export function ModerationActions({
  onDeletePost,
  onSilenceUser,
  onRemoveContent,
}: ModerationActionsProps) {
  return (
    <div className="table-actions">
      <button
        type="button"
        className="table-link table-link--danger"
        onClick={onDeletePost}
      >
        Excluir logicamente
      </button>
      {onRemoveContent ? (
        <button
          type="button"
          className="table-link"
          onClick={onRemoveContent}
        >
          Moderar conteudo
        </button>
      ) : null}
      <button
        type="button"
        className="table-link"
        onClick={onSilenceUser}
      >
        Silenciar usuario
      </button>
    </div>
  );
}
