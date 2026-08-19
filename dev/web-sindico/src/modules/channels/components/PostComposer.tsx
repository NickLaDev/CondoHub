import { useState } from 'react';
import { AttachmentUploader } from '@/components/attachments/AttachmentUploader';

interface PostComposerProps {
  instanceKey: string;
  onCreatePost: (payload: { text: string; attachmentIds: string[] }) => Promise<void>;
}

export function PostComposer({ instanceKey, onCreatePost }: PostComposerProps) {
  const [text, setText] = useState('');
  const [attachmentIds, setAttachmentIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSend = async () => {
    const trimmedText = text.trim();
    if (!trimmedText) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onCreatePost({ text: trimmedText, attachmentIds });
      setText('');
      setAttachmentIds([]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="composer-panel">
      <label className="field">
        <span className="field__label">Nova publicacao</span>
        <textarea
          rows={4}
          value={text}
          onChange={(event) => setText(event.target.value)}
          className="field__input composer-panel__input"
          placeholder="Escreva uma nova publicacao..."
        />
      </label>
      <AttachmentUploader instanceKey={instanceKey} onChange={setAttachmentIds} />
      <div className="composer-panel__actions">
        <button
          type="button"
          className="button button--ghost"
          disabled={isSubmitting || (!text.trim() && attachmentIds.length === 0)}
          onClick={() => {
            setText('');
            setAttachmentIds([]);
          }}
        >
          Limpar
        </button>
        <button
          type="button"
          className="button button--primary"
          disabled={isSubmitting || !text.trim()}
          onClick={() => void handleSend()}
        >
          {isSubmitting ? 'Enviando...' : 'Publicar'}
        </button>
      </div>
    </div>
  );
}
