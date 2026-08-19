import type { InboxStatus } from '@/modules/inbox/types';

interface InboxStatusControlProps {
  value: InboxStatus;
  onChange: (status: InboxStatus) => void;
  isSubmitting?: boolean;
}

export function InboxStatusControl({
  value,
  onChange,
  isSubmitting = false,
}: InboxStatusControlProps) {
  return (
    <label className="field">
      <span className="field__label">Status do atendimento</span>
      <select
        className="field__input"
        value={value}
        onChange={(event) => onChange(event.target.value as InboxStatus)}
        disabled={isSubmitting}
      >
        <option value="ABERTO">Aberto</option>
        <option value="EM_ATENDIMENTO">Em atendimento</option>
        <option value="RESOLVIDO">Resolvido</option>
        <option value="ARQUIVADO">Arquivado</option>
      </select>
    </label>
  );
}
