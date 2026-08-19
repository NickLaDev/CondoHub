export interface DashboardTicket {
  id: string;
  title: string;
  unitLabel: string;
  priority: string;
  status: string;
  assigneeName: string | null;
  openedAt: string | null;
  slaDueAt: string | null;
}

export interface DashboardDelivery {
  id: string;
  code: string;
  recipientName: string;
  unitLabel: string;
  courierName: string | null;
  status: string;
  updatedAt: string | null;
}

export interface DashboardLogEntry {
  id: string;
  createdAt: string | null;
  action: string;
  actorName: string | null;
  entity: string | null;
  requestId: string | null;
}

export interface DashboardSummary {
  metrics: {
    openTickets: number;
    overdueSla: number;
    reopenedTickets: number;
    pendingDeliveries: number;
  };
  criticalTickets: DashboardTicket[];
  deliveriesInDistribution: DashboardDelivery[];
  recentLogs: DashboardLogEntry[];
}
