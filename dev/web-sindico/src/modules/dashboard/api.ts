import { http } from '@/services/http';
import type {
  DashboardDelivery,
  DashboardLogEntry,
  DashboardSummary,
  DashboardTicket,
} from '@/modules/dashboard/types';

function toNumber(...candidates: unknown[]) {
  for (const candidate of candidates) {
    if (typeof candidate === 'number' && Number.isFinite(candidate)) {
      return candidate;
    }

    if (typeof candidate === 'string' && candidate.trim() !== '') {
      const parsed = Number(candidate);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return 0;
}

function toStringValue(candidate: unknown, fallback: string) {
  return typeof candidate === 'string' && candidate.trim() ? candidate : fallback;
}

function toNullableString(candidate: unknown) {
  return typeof candidate === 'string' && candidate.trim() ? candidate : null;
}

function toArray<T>(...candidates: unknown[]) {
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate as T[];
    }
  }

  return [] as T[];
}

function normalizeTicket(ticket: Record<string, unknown>, index: number): DashboardTicket {
  const assignee =
    typeof ticket.assignee === 'object' && ticket.assignee
      ? (ticket.assignee as Record<string, unknown>)
      : undefined;

  return {
    id: toStringValue(ticket.id, `ticket-${index}`),
    title: toStringValue(ticket.title ?? ticket.subject, `Ticket crítico ${index + 1}`),
    unitLabel: toStringValue(ticket.unitLabel ?? ticket.unit ?? ticket.unitNumber, 'Unidade não informada'),
    priority: toStringValue(ticket.priority ?? ticket.severity, 'N/A'),
    status: toStringValue(ticket.status, 'N/A'),
    assigneeName: toNullableString(ticket.assigneeName ?? assignee?.name),
    openedAt: toNullableString(ticket.openedAt ?? ticket.createdAt),
    slaDueAt: toNullableString(ticket.slaDueAt ?? ticket.deadlineAt),
  };
}

function normalizeDelivery(
  delivery: Record<string, unknown>,
  index: number,
): DashboardDelivery {
  return {
    id: toStringValue(delivery.id, `delivery-${index}`),
    code: toStringValue(delivery.code ?? delivery.protocol, `ENC-${index + 1}`),
    recipientName: toStringValue(delivery.recipientName ?? delivery.recipient, 'Destinatário não informado'),
    unitLabel: toStringValue(delivery.unitLabel ?? delivery.unit, 'Unidade não informada'),
    courierName: toNullableString(delivery.courierName ?? delivery.assigneeName),
    status: toStringValue(delivery.status, 'N/A'),
    updatedAt: toNullableString(delivery.updatedAt ?? delivery.dispatchedAt),
  };
}

function normalizeLog(log: Record<string, unknown>, index: number): DashboardLogEntry {
  return {
    id: toStringValue(log.id, `log-${index}`),
    createdAt: toNullableString(log.createdAt ?? log.timestamp),
    action: toStringValue(log.action ?? log.message, 'Ação não informada'),
    actorName: toNullableString(log.actorName ?? log.actor),
    entity: toNullableString(log.entity ?? log.targetType),
    requestId: toNullableString(log.requestId ?? log.request_id),
  };
}

function normalizeDashboardSummary(payload: Record<string, unknown>): DashboardSummary {
  const metricsPayload = (payload.metrics as Record<string, unknown> | undefined) ?? {};
  const ticketsPayload = (payload.tickets as Record<string, unknown> | undefined) ?? {};
  const deliveriesPayload = (payload.deliveries as Record<string, unknown> | undefined) ?? {};

  return {
    metrics: {
      openTickets: toNumber(
        metricsPayload.openTickets,
        payload.openTickets,
        ticketsPayload.open,
        ticketsPayload.abertos,
        payload.ticketsOpen,
      ),
      overdueSla: toNumber(
        metricsPayload.overdueSla,
        payload.overdueSla,
        ticketsPayload.overdue,
        ticketsPayload.atrasados,
        payload.slaOverdue,
      ),
      reopenedTickets: toNumber(
        metricsPayload.reopenedTickets,
        payload.reopenedTickets,
        ticketsPayload.reopened,
        ticketsPayload.reabertos,
        payload.ticketsReopened,
      ),
      pendingDeliveries: toNumber(
        metricsPayload.pendingDeliveries,
        payload.pendingDeliveries,
        deliveriesPayload.pending,
        deliveriesPayload.pendentes,
        payload.deliveriesPending,
      ),
    },
    criticalTickets: toArray<Record<string, unknown>>(
      payload.criticalTickets,
      ticketsPayload.critical,
      ticketsPayload.criticos,
      payload.ticketsCritical,
    ).map(normalizeTicket),
    deliveriesInDistribution: toArray<Record<string, unknown>>(
      payload.deliveriesInDistribution,
      deliveriesPayload.inDistribution,
      deliveriesPayload.emDistribuicao,
      payload.inDistributionDeliveries,
    ).map(normalizeDelivery),
    recentLogs: toArray<Record<string, unknown>>(
      payload.recentLogs,
      payload.logs,
      payload.auditLogs,
    ).map(normalizeLog),
  };
}

export async function getDashboardSummary(instanceKey: string) {
  const { data } = await http.get<Record<string, unknown>>(
    `/api/v1/${instanceKey}/dashboard/summary`,
    {
      tenantKey: instanceKey,
    },
  );

  return normalizeDashboardSummary(data);
}
