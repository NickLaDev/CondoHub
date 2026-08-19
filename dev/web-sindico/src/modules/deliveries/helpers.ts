import type { StatusType } from '@/components/feedback/StatusBadge';
import type { DeliveryStatus } from '@/modules/deliveries/types';

export function formatDeliveryDateTime(value: string | null | undefined) {
  if (!value) {
    return 'Sem data';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function getDeliveryStatusBadge(status: DeliveryStatus) {
  switch ((status ?? '').toUpperCase()) {
    case 'ENTREGUE':
      return { status: 'success' as StatusType, label: 'Entregue' };
    case 'NAO_ENTREGUE':
      return { status: 'danger' as StatusType, label: 'Nao entregue' };
    case 'EM_DISTRIBUICAO':
      return { status: 'info' as StatusType, label: 'Em distribuicao' };
    case 'CHEGOU':
    default:
      return { status: 'warning' as StatusType, label: 'Chegou' };
  }
}
