import type { StatusType } from '@/components/feedback/StatusBadge';

function normalizeToken(value: string | null | undefined) {
  return (value ?? '').trim().toUpperCase();
}

function readNumericSuffix(value: string) {
  const match = value.match(/(\d+)$/);

  if (match) {
    return match[1].padStart(3, '0');
  }

  return value.slice(-3).toUpperCase();
}

function humanizeToken(value: string | null | undefined) {
  const normalized = (value ?? '').trim().toLowerCase();

  if (!normalized) {
    return '--';
  }

  return normalized
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function formatDashboardTicketCode(id: string) {
  return `TK-${readNumericSuffix(id)}`;
}

export function formatDashboardDateTime(value: string | null | undefined) {
  if (!value) {
    return '--';
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return '--';
  }

  const datePart = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  }).format(parsed);
  const timePart = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);

  return `${datePart} ${timePart}`;
}

export function formatDashboardUnitLabel(value: string | null | undefined) {
  return value ?? 'Portaria';
}

export function getDashboardTicketPriorityBadge(priority: string) {
  switch (normalizeToken(priority)) {
    case 'CRITICA':
      return { status: 'danger' as StatusType, label: 'Critica' };
    case 'ALTA':
      return { status: 'warning' as StatusType, label: 'Alta' };
    case 'MEDIA':
      return { status: 'info' as StatusType, label: 'Media' };
    case 'BAIXA':
    default:
      return { status: 'neutral' as StatusType, label: humanizeToken(priority) };
  }
}

export function getDashboardTicketStatusBadge(status: string) {
  switch (normalizeToken(status)) {
    case 'EM_ANDAMENTO':
      return { status: 'violet' as StatusType, label: 'Em execucao' };
    case 'ABERTO':
      return { status: 'info' as StatusType, label: 'Aberto' };
    case 'PENDENTE':
      return { status: 'warning' as StatusType, label: 'Pendente' };
    case 'REABERTO':
      return { status: 'danger' as StatusType, label: 'Reaberto' };
    case 'RESOLVIDO':
      return { status: 'success' as StatusType, label: 'Resolvido' };
    case 'FECHADO':
    default:
      return { status: 'neutral' as StatusType, label: humanizeToken(status) };
  }
}

export function getDashboardDeliveryStatusBadge(status: string) {
  switch (normalizeToken(status)) {
    case 'EM_DISTRIBUICAO':
      return { status: 'warning' as StatusType, label: 'Em distribuicao' };
    case 'CHEGOU':
      return { status: 'info' as StatusType, label: 'Chegou' };
    case 'ENTREGUE':
      return { status: 'success' as StatusType, label: 'Entregue' };
    case 'NAO_ENTREGUE':
      return { status: 'danger' as StatusType, label: 'Nao entregue' };
    default:
      return { status: 'neutral' as StatusType, label: humanizeToken(status) };
  }
}

export function formatDashboardLogAction(action: string) {
  const normalized = normalizeToken(action);

  switch (normalized) {
    case 'DASHBOARD_VIEWED':
      return 'Consulta';
    case 'TICKET_CREATED':
    case 'DELIVERY_CREATED':
    case 'ANNOUNCEMENT_CREATED':
    case 'INVITE_CREATED':
      return 'Criacao';
    case 'TICKET_UPDATED':
    case 'UNIT_UPDATED':
    case 'BLOCK_UPDATED':
      return 'Atualizacao';
    case 'DELIVERY_ASSIGNED':
    case 'TICKET_ASSIGNED':
      return 'Atribuicao';
    case 'DELIVERY_COMPLETED':
      return 'Conclusao';
    case 'TICKET_REOPENED':
      return 'Reabertura';
    default:
      return humanizeToken(action);
  }
}

export function formatDashboardLogType(entity: string | null | undefined) {
  switch (normalizeToken(entity)) {
    case 'TICKET':
      return 'Ticket';
    case 'DELIVERY':
      return 'Delivery';
    case 'ANNOUNCEMENT':
      return 'Mural';
    case 'INVITE':
      return 'Invite';
    case 'INBOX_THREAD':
      return 'Atendimento';
    case 'DASHBOARD':
      return 'Dashboard';
    case 'TURN':
      return 'Turno';
    case 'UNIT':
      return 'Unidade';
    case 'BLOCK':
      return 'Bloco';
    case 'CONDO':
      return 'Condominio';
    default:
      return humanizeToken(entity);
  }
}
