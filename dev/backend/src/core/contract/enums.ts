export const TICKET_STATUS = {
  ABERTO: 'ABERTO',
  EM_ANALISE: 'EM_ANALISE',
  EM_EXECUCAO: 'EM_EXECUCAO',
  RESOLVIDO: 'RESOLVIDO',
  FECHADO: 'FECHADO',
  REABERTO: 'REABERTO',
} as const;

export type TicketStatus = (typeof TICKET_STATUS)[keyof typeof TICKET_STATUS];

export const DELIVERY_STATUS = {
  CHEGOU: 'CHEGOU',
  EM_DISTRIBUICAO: 'EM_DISTRIBUICAO',
  ENTREGUE: 'ENTREGUE',
  NAO_ENTREGUE: 'NAO_ENTREGUE',
} as const;

export type DeliveryStatus = (typeof DELIVERY_STATUS)[keyof typeof DELIVERY_STATUS];
