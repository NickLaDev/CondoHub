export interface TurnInfo {
  id: string;
  actorName: string | null;
  startedAt: string | null;
  endedAt: string | null;
  isOpen: boolean;
}

export interface TurnQueueDelivery {
  id: string;
  code: string;
  recipientName: string;
  unitLabel: string | null;
  status: string;
}

export interface TurnSnapshot {
  currentTurn: TurnInfo | null;
  history: TurnInfo[];
  queueDeliveries: TurnQueueDelivery[];
  unavailable?: boolean;
}
