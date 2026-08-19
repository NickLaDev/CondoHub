import type { StatusType } from '@/components/feedback/StatusBadge';
import type { InboxMessage, InboxStatus, InboxThread } from '@/modules/inbox/types';

export function getInboxStatusBadge(status: InboxStatus): {
  status: StatusType;
  label: string;
} {
  switch (status) {
    case 'ABERTO':
      return { status: 'active', label: 'Aberto' };
    case 'EM_ATENDIMENTO':
      return { status: 'info', label: 'Em atendimento' };
    case 'RESOLVIDO':
      return { status: 'success', label: 'Resolvido' };
    case 'ARQUIVADO':
      return { status: 'archived', label: 'Arquivado' };
    default:
      return { status: 'neutral', label: status };
  }
}

export function getInboxThreadUnitLabel(thread: InboxThread) {
  if (thread.unitLabel) {
    return thread.unitLabel;
  }

  if (thread.unit?.label) {
    return thread.unit.label;
  }

  if (thread.unit?.blockName && thread.unit?.number) {
    return `${thread.unit.blockName} - ${thread.unit.number}`;
  }

  if (thread.unit?.number) {
    return `Unidade ${thread.unit.number}`;
  }

  if (thread.unitId) {
    return `Unidade ${thread.unitId}`;
  }

  return 'Unidade nÃ£o informada';
}

export function getInboxMessageBody(message: InboxMessage) {
  return message.body ?? message.message ?? message.text ?? '';
}

export function isInboxMessageFromAdmin(message: InboxMessage) {
  if (typeof message.isFromAdmin === 'boolean') {
    return message.isFromAdmin;
  }

  const sender = (message.sender ?? message.authorName ?? '').toLowerCase();
  return sender.includes('admin') || sender.includes('sindico') || sender.includes('administra');
}

export function formatInboxDateTime(value?: string | null) {
  if (!value) {
    return 'Sem data';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}
