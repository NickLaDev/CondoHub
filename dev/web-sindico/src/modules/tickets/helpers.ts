import type { StatusType } from '@/components/feedback/StatusBadge';
import type {
  TicketPriority,
  TicketStatus,
  TicketSummary,
} from '@/modules/tickets/types';

export const ticketStatusOptions: TicketStatus[] = [
  'ABERTO',
  'EM_ANDAMENTO',
  'PENDENTE',
  'RESOLVIDO',
  'FECHADO',
  'REABERTO',
];

function toUpperToken(value: string | null | undefined) {
  return (value ?? '').toUpperCase().trim();
}

export function formatTicketDateTime(value: string | null | undefined) {
  if (!value) {
    return 'Sem data';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function getTicketStatusBadge(status: TicketStatus) {
  const normalized = toUpperToken(status);

  switch (normalized) {
    case 'RESOLVIDO':
      return { status: 'success' as StatusType, label: 'Resolvido' };
    case 'FECHADO':
      return { status: 'neutral' as StatusType, label: 'Fechado' };
    case 'EM_ANDAMENTO':
      return { status: 'info' as StatusType, label: 'Em andamento' };
    case 'PENDENTE':
      return { status: 'warning' as StatusType, label: 'Pendente' };
    case 'REABERTO':
      return { status: 'danger' as StatusType, label: 'Reaberto' };
    case 'ABERTO':
    default:
      return { status: 'active' as StatusType, label: normalized || 'Aberto' };
  }
}

export function getTicketPriorityBadge(priority: TicketPriority) {
  const normalized = toUpperToken(priority);

  switch (normalized) {
    case 'CRITICA':
      return { status: 'danger' as StatusType, label: 'Critica' };
    case 'ALTA':
      return { status: 'warning' as StatusType, label: 'Alta' };
    case 'BAIXA':
      return { status: 'neutral' as StatusType, label: 'Baixa' };
    case 'MEDIA':
    default:
      return { status: 'info' as StatusType, label: normalized || 'Media' };
  }
}

export function isTicketOverdue(ticket: TicketSummary) {
  if (ticket.overdue) {
    return true;
  }

  if (!ticket.dueAt) {
    return false;
  }

  return new Date(ticket.dueAt).getTime() < Date.now();
}

export function getTicketSlaBadge(ticket: TicketSummary) {
  if (!ticket.dueAt) {
    return { status: 'neutral' as StatusType, label: 'Sem SLA' };
  }

  if (isTicketOverdue(ticket)) {
    return { status: 'danger' as StatusType, label: 'SLA atrasado' };
  }

  return { status: 'success' as StatusType, label: 'SLA em dia' };
}
