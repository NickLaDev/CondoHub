import {
  AxiosHeaders,
  type AxiosAdapter,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import type {
  DashboardDelivery,
  DashboardLogEntry,
  DashboardSummary,
  DashboardTicket,
} from '@/modules/dashboard/types';
import type {
  AssignDeliveryRequest,
  CompleteDeliveryRequest,
  CreateDeliveryRequest,
  DeliverySummary,
  FailDeliveryRequest,
} from '@/modules/deliveries/types';
import type { InboxMessage, InboxStatus } from '@/modules/inbox/types';
import type {
  CreateChannelCommentRequest,
  CreateChannelPostRequest,
  CreateChannelRequest,
  RemoveChannelContentRequest,
  SilenceChannelUserRequest,
  UpdateChannelRequest,
} from '@/modules/channels/types';
import type { CreateAnnouncementRequest, UpdateAnnouncementRequest } from '@/modules/announcements/types';
import type { UpdateCondoProfileRequest } from '@/modules/condo/types';
import type { CreateInviteRequest } from '@/modules/invites/types';
import type {
  CreateBlockRequest,
  CreateUnitRequest,
  UpdateBlockRequest,
  UpdateUnitRequest,
} from '@/modules/structure/types';
import type {
  AssignTicketRequest,
  CreateTicketRequest,
  ReopenTicketRequest,
  SendTicketMessageRequest,
  UpdateTicketStatusRequest,
} from '@/modules/tickets/types';
import type {
  CreateResidentRequest,
  CreateStaffRequest,
  UpdateResidentRequest,
  UpdateStaffRequest,
} from '@/modules/users/types';
import type {
  InstanceSelectionOption,
  LoginCredentials,
  SelectInstanceRequest,
} from '@/modules/auth/types';
import { createDevTenantSession } from '@/dev/mockAuth';
import {
  getDevMockState,
  registerDevAttachmentUpload,
  resolveDevAttachmentUrl,
  type DevMockState,
} from '@/dev/mockData';

type JsonRecord = Record<string, unknown>;

const OPEN_TICKET_STATUSES = new Set(['ABERTO', 'EM_ANDAMENTO', 'PENDENTE', 'REABERTO']);
const PENDING_DELIVERY_STATUSES = new Set(['CHEGOU', 'EM_DISTRIBUICAO']);
const CLOSED_DELIVERY_STATUSES = new Set(['ENTREGUE', 'NAO_ENTREGUE']);
const DEV_SELECTION_TOKEN = 'dev-selection-token';
const DEV_EXPIRED_SELECTION_TOKEN = 'dev-expired-selection-token';
const DEV_SELECTION_OPTIONS: InstanceSelectionOption[] = [
  {
    instanceId: 'dev-instance',
    instanceKey: 'dev',
    instanceName: 'CondoHub Dev',
    userId: 'dev-user',
    unitId: null,
    unitLabel: null,
    roles: ['SINDICO_ADMIN'],
  },
  {
    instanceId: 'demo-instance',
    instanceKey: 'demo',
    instanceName: 'CondoHub Demo',
    userId: 'demo-user',
    unitId: null,
    unitLabel: null,
    roles: ['SINDICO_ADMIN'],
  },
];

function sleep(ms = 140) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function asObject(value: unknown): JsonRecord | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as JsonRecord;
  }

  return null;
}

function readBody<T>(rawData: unknown): T {
  if (typeof rawData === 'string' && rawData.trim()) {
    return JSON.parse(rawData) as T;
  }

  return (rawData ?? {}) as T;
}

function readString(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function readBoolean(value: unknown) {
  return value === true || value === 'true';
}

function readNumber(value: unknown, fallback: number) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function includesSearch(search: string, ...values: Array<string | null | undefined>) {
  const normalized = search.trim().toLowerCase();

  if (!normalized) {
    return true;
  }

  return values.some((value) => (value ?? '').toLowerCase().includes(normalized));
}

function sortByNewest<T>(items: T[], selector: (item: T) => string | null | undefined) {
  return items.slice().sort((left, right) => {
    const leftValue = selector(left);
    const rightValue = selector(right);
    const leftTime = leftValue ? new Date(leftValue).getTime() : 0;
    const rightTime = rightValue ? new Date(rightValue).getTime() : 0;
    return rightTime - leftTime;
  });
}

function paginate<T>(items: T[], params: JsonRecord | undefined, defaultLimit = 10) {
  const page = Math.max(1, readNumber(params?.page, 1));
  const limit = Math.max(1, readNumber(params?.limit, defaultLimit));
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;

  return {
    data: items.slice(start, start + limit),
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

function jsonResponse<T>(
  config: InternalAxiosRequestConfig,
  data: T,
  status = 200,
): AxiosResponse<T> {
  return {
    data,
    status,
    statusText: status === 204 ? 'No Content' : 'OK',
    headers: new AxiosHeaders(),
    config,
    request: { mocked: true },
  };
}

function findUnit(state: DevMockState, unitId: string | null | undefined) {
  if (!unitId) {
    return null;
  }

  return state.units.find((unit) => unit.id === unitId) ?? null;
}

function findStaff(state: DevMockState, staffId: string | null | undefined) {
  if (!staffId) {
    return null;
  }

  return state.staff.find((staff) => staff.id === staffId) ?? null;
}

function nextId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

function appendLog(
  state: DevMockState,
  input: {
    action: string;
    entity: string;
    context: string;
    detailsJson?: unknown;
    unitId?: string | null;
    unitLabel?: string | null;
    actorName?: string | null;
    actorId?: string | null;
  },
) {
  state.logs.unshift({
    id: nextId('log'),
    createdAt: new Date().toISOString(),
    actorName: input.actorName ?? 'Síndico Dev',
    actorId: input.actorId ?? 'dev-user',
    action: input.action,
    entity: input.entity,
    requestId: nextId('req'),
    unitId: input.unitId ?? null,
    unitLabel: input.unitLabel ?? null,
    context: input.context,
    detailsJson: input.detailsJson ?? null,
    ip: '127.0.0.1',
    userAgent: 'web-sindico/dev',
  });
}

function buildDashboardSummary(state: DevMockState): DashboardSummary {
  const criticalTickets: DashboardTicket[] = sortByNewest(
    state.tickets.filter((ticket) =>
      ['CRITICA', 'ALTA'].includes(ticket.priority) && OPEN_TICKET_STATUSES.has(ticket.status),
    ),
    (ticket) => ticket.updatedAt ?? ticket.createdAt,
  )
    .slice(0, 5)
    .map((ticket) => ({
      id: ticket.id,
      title: ticket.title,
      unitLabel: ticket.unitLabel ?? 'Unidade nao informada',
      priority: ticket.priority,
      status: ticket.status,
      assigneeName: ticket.assignee?.name ?? null,
      openedAt: ticket.createdAt,
      slaDueAt: ticket.dueAt,
    }));

  const deliveriesInDistribution: DashboardDelivery[] = sortByNewest(
    state.deliveries.filter((delivery) => delivery.status === 'EM_DISTRIBUICAO'),
    (delivery) => delivery.updatedAt ?? delivery.createdAt,
  )
    .slice(0, 5)
    .map((delivery) => ({
      id: delivery.id,
      code: delivery.code,
      recipientName: delivery.recipientName,
      unitLabel: delivery.unitLabel ?? 'Unidade nao informada',
      courierName: delivery.courierName,
      status: delivery.status,
      updatedAt: delivery.updatedAt ?? delivery.createdAt,
    }));

  const recentLogs: DashboardLogEntry[] = sortByNewest(state.logs, (log) => log.createdAt)
    .slice(0, 6)
    .map((log) => ({
      id: log.id,
      createdAt: log.createdAt,
      action: log.action,
      actorName: log.actorName,
      entity: log.entity,
      requestId: log.requestId,
    }));

  return {
    metrics: {
      openTickets: state.tickets.filter((ticket) => OPEN_TICKET_STATUSES.has(ticket.status)).length,
      overdueSla: state.tickets.filter((ticket) => ticket.overdue).length,
      reopenedTickets: state.tickets.filter((ticket) => ticket.status === 'REABERTO').length,
      pendingDeliveries: state.deliveries.filter((delivery) => PENDING_DELIVERY_STATUSES.has(delivery.status)).length,
    },
    criticalTickets,
    deliveriesInDistribution,
    recentLogs,
  };
}

function buildQueuePayload(state: DevMockState) {
  return {
    queue: sortByNewest(
      state.deliveries.filter((delivery) => !CLOSED_DELIVERY_STATUSES.has(delivery.status)),
      (delivery) => delivery.updatedAt ?? delivery.createdAt,
    ),
    currentTurn: state.currentTurn,
    history: state.turnHistory,
  };
}

async function handleMockUpload(instanceKey: string, fileName: string) {
  const attachmentId = nextId('att-presign');
  const state = getDevMockState(instanceKey);

  state.attachments[attachmentId] = {
    id: attachmentId,
    fileName,
    contentType: 'application/octet-stream',
    url: `data:text/plain;charset=utf-8,${encodeURIComponent(fileName)}`,
    createdAt: new Date().toISOString(),
  };

  return {
    attachmentId,
    uploadUrl: `mock://upload/${attachmentId}`,
    bucket: 'dev-local',
    path: attachmentId,
  };
}

async function handleInstanceApi(
  config: InternalAxiosRequestConfig,
  instanceKey: string,
  segments: string[],
): Promise<AxiosResponse | null> {
  const state = getDevMockState(instanceKey);
  const method = (config.method ?? 'get').toUpperCase();
  const params = asObject(config.params ?? undefined) ?? undefined;

  if (segments.length === 2 && segments[0] === 'auth' && segments[1] === 'me' && method === 'GET') {
    return jsonResponse(config, createDevTenantSession(instanceKey).user);
  }

  if (segments.length === 2 && segments[0] === 'auth' && segments[1] === 'login' && method === 'POST') {
    return jsonResponse(config, createDevTenantSession(instanceKey));
  }

  if (segments.length === 2 && segments[0] === 'auth' && segments[1] === 'logout' && method === 'POST') {
    return jsonResponse(config, {}, 204);
  }

  if (segments.length === 2 && segments[0] === 'dashboard' && segments[1] === 'summary' && method === 'GET') {
    return jsonResponse(config, buildDashboardSummary(state));
  }

  if (segments.length === 2 && segments[0] === 'condo' && segments[1] === 'profile') {
    if (method === 'GET') {
      return jsonResponse(config, state.condoProfile);
    }

    if (method === 'PATCH') {
      const body = readBody<UpdateCondoProfileRequest>(config.data);
      state.condoProfile = {
        ...state.condoProfile,
        ...body,
        updatedAt: new Date().toISOString(),
      };
      appendLog(state, {
        action: 'CONDO_PROFILE_UPDATED',
        entity: 'condo',
        context: 'Perfil do condominio atualizado localmente.',
        detailsJson: body,
      });
      return jsonResponse(config, state.condoProfile);
    }
  }

  if (segments[0] === 'structure' && segments[1] === 'blocks') {
    if (segments.length === 2 && method === 'GET') {
      const search = readString(params?.search);
      const rows = sortByNewest(
        state.blocks.filter((block) => includesSearch(search, block.name)),
        (block) => block.updatedAt,
      );
      return jsonResponse(config, paginate(rows, params));
    }

    if (segments.length === 2 && method === 'POST') {
      const body = readBody<CreateBlockRequest>(config.data);
      const block = {
        id: nextId('block'),
        name: body.name.trim(),
        status: 'active' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      state.blocks.unshift(block);
      appendLog(state, {
        action: 'BLOCK_CREATED',
        entity: 'block',
        context: `Bloco ${block.name} criado em modo mock.`,
        detailsJson: block,
      });
      return jsonResponse(config, block, 201);
    }

    if (segments.length === 3 && method === 'PATCH') {
      const block = state.blocks.find((item) => item.id === segments[2]) ?? null;
      if (!block) {
        return jsonResponse(config, { message: 'Bloco nao encontrado.' }, 404);
      }

      const body = readBody<UpdateBlockRequest>(config.data);
      block.name = body.name?.trim() || block.name;
      block.updatedAt = new Date().toISOString();
      appendLog(state, {
        action: 'BLOCK_UPDATED',
        entity: 'block',
        context: `Bloco ${block.name} atualizado em modo mock.`,
        detailsJson: body,
      });
      return jsonResponse(config, block);
    }

    if (segments.length === 4 && segments[3] === 'archive' && method === 'POST') {
      const block = state.blocks.find((item) => item.id === segments[2]) ?? null;
      if (!block) {
        return jsonResponse(config, { message: 'Bloco nao encontrado.' }, 404);
      }

      block.status = 'archived';
      block.updatedAt = new Date().toISOString();
      appendLog(state, {
        action: 'BLOCK_ARCHIVED',
        entity: 'block',
        context: `Bloco ${block.name} arquivado em modo mock.`,
        detailsJson: { blockId: block.id },
      });
      return jsonResponse(config, {});
    }
  }

  if (segments[0] === 'structure' && segments[1] === 'units') {
    if (segments.length === 2 && method === 'GET') {
      const search = readString(params?.search);
      const blockId = readString(params?.blockId);
      const rows = sortByNewest(
        state.units.filter((unit) =>
          (!blockId || unit.blockId === blockId)
          && includesSearch(search, unit.number, unit.block.name),
        ),
        (unit) => unit.updatedAt,
      );
      return jsonResponse(config, paginate(rows, params));
    }

    if (segments.length === 2 && method === 'POST') {
      const body = readBody<CreateUnitRequest>(config.data);
      const block = state.blocks.find((item) => item.id === body.blockId) ?? null;
      if (!block) {
        return jsonResponse(config, { message: 'Bloco nao encontrado.' }, 404);
      }

      const unit = {
        id: nextId('unit'),
        blockId: block.id,
        block,
        number: body.number.trim(),
        status: 'active' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      state.units.unshift(unit);
      appendLog(state, {
        action: 'UNIT_CREATED',
        entity: 'unit',
        context: `Unidade ${block.name} - ${unit.number} criada em modo mock.`,
        unitId: unit.id,
        unitLabel: `${block.name} - ${unit.number}`,
        detailsJson: unit,
      });
      return jsonResponse(config, unit, 201);
    }

    if (segments.length === 3 && method === 'PATCH') {
      const unit = state.units.find((item) => item.id === segments[2]) ?? null;
      if (!unit) {
        return jsonResponse(config, { message: 'Unidade nao encontrada.' }, 404);
      }

      const body = readBody<UpdateUnitRequest>(config.data);
      const nextBlock = body.blockId
        ? state.blocks.find((item) => item.id === body.blockId) ?? unit.block
        : unit.block;
      unit.blockId = nextBlock.id;
      unit.block = nextBlock;
      unit.number = body.number?.trim() || unit.number;
      unit.updatedAt = new Date().toISOString();
      appendLog(state, {
        action: 'UNIT_UPDATED',
        entity: 'unit',
        context: `Unidade ${unit.block.name} - ${unit.number} atualizada em modo mock.`,
        unitId: unit.id,
        unitLabel: `${unit.block.name} - ${unit.number}`,
        detailsJson: body,
      });
      return jsonResponse(config, unit);
    }

    if (segments.length === 4 && segments[3] === 'archive' && method === 'POST') {
      const unit = state.units.find((item) => item.id === segments[2]) ?? null;
      if (!unit) {
        return jsonResponse(config, { message: 'Unidade nao encontrada.' }, 404);
      }

      unit.status = 'archived';
      unit.updatedAt = new Date().toISOString();
      appendLog(state, {
        action: 'UNIT_ARCHIVED',
        entity: 'unit',
        context: `Unidade ${unit.block.name} - ${unit.number} arquivada em modo mock.`,
        unitId: unit.id,
        unitLabel: `${unit.block.name} - ${unit.number}`,
      });
      return jsonResponse(config, {});
    }
  }

  if (segments[0] === 'users' && segments[1] === 'residents') {
    if (segments.length === 2 && method === 'GET') {
      const search = readString(params?.search);
      const blockId = readString(params?.blockId);
      const unitId = readString(params?.unitId);
      const status = readString(params?.status);
      const rows = sortByNewest(
        state.residents.filter((resident) =>
          (!blockId || resident.unit.block.id === blockId)
          && (!unitId || resident.unitId === unitId)
          && (!status || resident.status === status)
          && includesSearch(
            search,
            resident.name,
            resident.email,
            resident.phone,
            resident.unit.number,
            resident.unit.block.name,
          ),
        ),
        (resident) => resident.updatedAt,
      );
      return jsonResponse(config, paginate(rows, params));
    }

    if (segments.length === 2 && method === 'POST') {
      const body = readBody<CreateResidentRequest>(config.data);
      const unit = findUnit(state, body.unitId);
      if (!unit) {
        return jsonResponse(config, { message: 'Unidade nao encontrada.' }, 404);
      }

      const resident = {
        id: nextId('resident'),
        name: body.name.trim(),
        email: body.email.trim(),
        phone: body.phone?.trim() || undefined,
        unitId: unit.id,
        unit: {
          id: unit.id,
          number: unit.number,
          block: { id: unit.block.id, name: unit.block.name },
        },
        status: 'active' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      state.residents.unshift(resident);
      appendLog(state, {
        action: 'RESIDENT_CREATED',
        entity: 'resident',
        context: `Morador ${resident.name} criado em modo mock.`,
        unitId: unit.id,
        unitLabel: `${unit.block.name} - ${unit.number}`,
        detailsJson: resident,
      });
      return jsonResponse(config, resident, 201);
    }

    if (segments.length === 3 && method === 'PATCH') {
      const resident = state.residents.find((item) => item.id === segments[2]) ?? null;
      if (!resident) {
        return jsonResponse(config, { message: 'Morador nao encontrado.' }, 404);
      }

      const body = readBody<UpdateResidentRequest>(config.data);
      const nextUnit = body.unitId ? findUnit(state, body.unitId) : findUnit(state, resident.unitId);
      if (!nextUnit) {
        return jsonResponse(config, { message: 'Unidade nao encontrada.' }, 404);
      }

      resident.name = body.name?.trim() || resident.name;
      resident.email = body.email?.trim() || resident.email;
      resident.phone = body.phone?.trim() || resident.phone;
      resident.unitId = nextUnit.id;
      resident.unit = {
        id: nextUnit.id,
        number: nextUnit.number,
        block: { id: nextUnit.block.id, name: nextUnit.block.name },
      };
      resident.updatedAt = new Date().toISOString();
      appendLog(state, {
        action: 'RESIDENT_UPDATED',
        entity: 'resident',
        context: `Morador ${resident.name} atualizado em modo mock.`,
        unitId: nextUnit.id,
        unitLabel: `${nextUnit.block.name} - ${nextUnit.number}`,
        detailsJson: body,
      });
      return jsonResponse(config, resident);
    }

    if (segments.length === 4 && segments[3] === 'disable' && method === 'POST') {
      const resident = state.residents.find((item) => item.id === segments[2]) ?? null;
      if (!resident) {
        return jsonResponse(config, { message: 'Morador nao encontrado.' }, 404);
      }

      resident.status = 'inactive';
      resident.updatedAt = new Date().toISOString();
      appendLog(state, {
        action: 'RESIDENT_DISABLED',
        entity: 'resident',
        context: `Morador ${resident.name} desativado em modo mock.`,
        unitId: resident.unitId,
        unitLabel: `${resident.unit.block.name} - ${resident.unit.number}`,
      });
      return jsonResponse(config, {});
    }
  }

  if (segments[0] === 'users' && segments[1] === 'staff') {
    if (segments.length === 2 && method === 'GET') {
      const search = readString(params?.search);
      const role = readString(params?.role);
      const status = readString(params?.status);
      const rows = sortByNewest(
        state.staff.filter((member) =>
          (!role || member.role === role)
          && (!status || member.status === status)
          && includesSearch(search, member.name, member.email, member.phone, member.role),
        ),
        (member) => member.updatedAt,
      );
      return jsonResponse(config, paginate(rows, params));
    }

    if (segments.length === 2 && method === 'POST') {
      const body = readBody<CreateStaffRequest>(config.data);
      const member = {
        id: nextId('staff'),
        name: body.name.trim(),
        email: body.email.trim(),
        phone: body.phone?.trim() || undefined,
        role: body.role,
        status: 'active' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      state.staff.unshift(member);
      appendLog(state, {
        action: 'STAFF_CREATED',
        entity: 'staff',
        context: `Funcionario ${member.name} criado em modo mock.`,
        detailsJson: member,
      });
      return jsonResponse(config, member, 201);
    }

    if (segments.length === 3 && method === 'PATCH') {
      const member = state.staff.find((item) => item.id === segments[2]) ?? null;
      if (!member) {
        return jsonResponse(config, { message: 'Funcionario nao encontrado.' }, 404);
      }

      const body = readBody<UpdateStaffRequest>(config.data);
      member.name = body.name?.trim() || member.name;
      member.email = body.email?.trim() || member.email;
      member.phone = body.phone?.trim() || member.phone;
      member.role = body.role ?? member.role;
      member.updatedAt = new Date().toISOString();
      appendLog(state, {
        action: 'STAFF_UPDATED',
        entity: 'staff',
        context: `Funcionario ${member.name} atualizado em modo mock.`,
        detailsJson: body,
      });
      return jsonResponse(config, member);
    }

    if (segments.length === 4 && segments[3] === 'disable' && method === 'POST') {
      const member = state.staff.find((item) => item.id === segments[2]) ?? null;
      if (!member) {
        return jsonResponse(config, { message: 'Funcionario nao encontrado.' }, 404);
      }

      member.status = 'inactive';
      member.updatedAt = new Date().toISOString();
      appendLog(state, {
        action: 'STAFF_DISABLED',
        entity: 'staff',
        context: `Funcionario ${member.name} desativado em modo mock.`,
      });
      return jsonResponse(config, {});
    }
  }

  if (segments[0] === 'invites') {
    if (segments.length === 1 && method === 'GET') {
      const search = readString(params?.search);
      const type = readString(params?.type);
      const status = readString(params?.status);
      const rows = sortByNewest(
        state.invites.filter((invite) =>
          (!type || invite.type === type)
          && (!status || invite.status === status)
          && includesSearch(
            search,
            invite.email,
            invite.type,
            invite.unit?.number,
            invite.unit?.block.name,
          ),
        ),
        (invite) => invite.updatedAt,
      );
      return jsonResponse(config, paginate(rows, params));
    }

    if (segments.length === 1 && method === 'POST') {
      const body = readBody<CreateInviteRequest>(config.data);
      const unit = findUnit(state, body.unitId);
      const invite = {
        id: nextId('invite'),
        type: body.type,
        email: body.email.trim(),
        unitId: unit?.id,
        unit: unit
          ? {
              id: unit.id,
              number: unit.number,
              block: { id: unit.block.id, name: unit.block.name },
            }
          : undefined,
        status: 'PENDING' as const,
        expiresAt: new Date(
          Date.now() + Math.max(1, body.expiresInDays ?? 7) * 24 * 60 * 60 * 1000,
        ).toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      state.invites.unshift(invite);
      appendLog(state, {
        action: 'INVITE_CREATED',
        entity: 'invite',
        context: `Convite ${invite.email} criado em modo mock.`,
        unitId: invite.unitId,
        unitLabel: invite.unit ? `${invite.unit.block.name} - ${invite.unit.number}` : null,
        detailsJson: invite,
      });
      return jsonResponse(config, invite, 201);
    }

    if (segments.length === 3 && segments[2] === 'revoke' && method === 'POST') {
      const invite = state.invites.find((item) => item.id === segments[1]) ?? null;
      if (!invite) {
        return jsonResponse(config, { message: 'Convite nao encontrado.' }, 404);
      }

      invite.status = 'REVOKED';
      invite.revokedAt = new Date().toISOString();
      invite.updatedAt = invite.revokedAt;
      appendLog(state, {
        action: 'INVITE_REVOKED',
        entity: 'invite',
        context: `Convite ${invite.email} revogado em modo mock.`,
      });
      return jsonResponse(config, {});
    }
  }

  if (segments[0] === 'announcements') {
    if (segments.length === 1 && method === 'GET') {
      const search = readString(params?.search);
      const archived = readBoolean(params?.archived);
      const requireAck = readBoolean(params?.requireAck);
      const rows = sortByNewest(
        state.announcements.filter((announcement) => {
          const isArchived = Boolean(announcement.archived || announcement.archivedAt);

          return (archived ? isArchived : !isArchived)
          && (!requireAck || announcement.requireAck)
          && includesSearch(search, announcement.title, announcement.body);
        }),
        (announcement) => announcement.updatedAt ?? announcement.createdAt,
      );
      return jsonResponse(config, paginate(rows, params));
    }

    if (segments.length === 1 && method === 'POST') {
      const body = readBody<CreateAnnouncementRequest>(config.data);
      const announcement = {
        id: nextId('announcement'),
        title: body.title.trim(),
        body: body.body.trim(),
        requireAck: body.requireAck,
        attachmentIds: body.attachmentIds ?? [],
        ackCount: 0,
        totalAckRequired: body.requireAck ? Math.max(1, state.units.filter((unit) => unit.status === 'active').length) : 0,
        acknowledgements: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      state.announcements.unshift(announcement);
      appendLog(state, {
        action: 'ANNOUNCEMENT_CREATED',
        entity: 'announcement',
        context: `Comunicado ${announcement.title} criado em modo mock.`,
        detailsJson: announcement,
      });
      return jsonResponse(config, announcement, 201);
    }

    if (segments.length === 2 && method === 'PATCH') {
      const announcement = state.announcements.find((item) => item.id === segments[1]) ?? null;
      if (!announcement) {
        return jsonResponse(config, { message: 'Comunicado nao encontrado.' }, 404);
      }

      const body = readBody<UpdateAnnouncementRequest>(config.data);
      announcement.title = body.title?.trim() || announcement.title;
      announcement.body = body.body?.trim() || announcement.body;
      announcement.requireAck = body.requireAck ?? announcement.requireAck;
      announcement.attachmentIds = body.attachmentIds ?? announcement.attachmentIds;
      announcement.updatedAt = new Date().toISOString();
      appendLog(state, {
        action: 'ANNOUNCEMENT_UPDATED',
        entity: 'announcement',
        context: `Comunicado ${announcement.title} atualizado em modo mock.`,
        detailsJson: body,
      });
      return jsonResponse(config, announcement);
    }

    if (segments.length === 3 && segments[2] === 'archive' && method === 'POST') {
      const announcement = state.announcements.find((item) => item.id === segments[1]) ?? null;
      if (!announcement) {
        return jsonResponse(config, { message: 'Comunicado nao encontrado.' }, 404);
      }

      announcement.archived = true;
      announcement.archivedAt = new Date().toISOString();
      announcement.updatedAt = announcement.archivedAt;
      appendLog(state, {
        action: 'ANNOUNCEMENT_ARCHIVED',
        entity: 'announcement',
        context: `Comunicado ${announcement.title} arquivado em modo mock.`,
      });
      return jsonResponse(config, {});
    }

    if (segments.length === 3 && segments[2] === 'ack' && method === 'POST') {
      const announcement = state.announcements.find((item) => item.id === segments[1]) ?? null;
      if (!announcement) {
        return jsonResponse(config, { message: 'Comunicado nao encontrado.' }, 404);
      }

      announcement.ackCount = (announcement.ackCount ?? 0) + 1;
      announcement.acknowledgements = [
        {
          id: nextId('ack'),
          userId: 'dev-user',
          userName: 'Síndico Dev',
          unitId: null,
          unitLabel: null,
          ackAt: new Date().toISOString(),
        },
        ...(announcement.acknowledgements ?? []),
      ];
      announcement.updatedAt = new Date().toISOString();
      return jsonResponse(config, {});
    }
  }

  if (segments[0] === 'channels') {
    if (segments.length === 1 && method === 'GET') {
      const search = readString(params?.search);
      const rows = sortByNewest(
        state.channels.filter((channel) =>
          includesSearch(search, channel.name, channel.description ?? '', channel.visibility),
        ),
        (channel) => channel.updatedAt,
      );
      return jsonResponse(config, paginate(rows, params));
    }

    if (segments.length === 1 && method === 'POST') {
      const body = readBody<CreateChannelRequest>(config.data);
      const channel = {
        id: nextId('channel'),
        name: body.name.trim(),
        description: body.description?.trim() || null,
        visibility: body.visibility ?? 'PUBLIC',
        status: 'active' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      state.channels.unshift(channel);
      state.channelPosts[channel.id] = [];
      appendLog(state, {
        action: 'CHANNEL_CREATED',
        entity: 'channel',
        context: `Canal ${channel.name} criado em modo mock.`,
        detailsJson: channel,
      });
      return jsonResponse(config, channel, 201);
    }

    if (segments.length === 2 && method === 'PATCH') {
      const channel = state.channels.find((item) => item.id === segments[1]) ?? null;
      if (!channel) {
        return jsonResponse(config, { message: 'Canal nao encontrado.' }, 404);
      }

      const body = readBody<UpdateChannelRequest>(config.data);
      channel.name = body.name?.trim() || channel.name;
      channel.description = body.description?.trim() || channel.description;
      channel.visibility = body.visibility ?? channel.visibility;
      channel.updatedAt = new Date().toISOString();
      appendLog(state, {
        action: 'CHANNEL_UPDATED',
        entity: 'channel',
        context: `Canal ${channel.name} atualizado em modo mock.`,
        detailsJson: body,
      });
      return jsonResponse(config, channel);
    }

    if (segments.length === 3 && segments[2] === 'archive' && method === 'POST') {
      const channel = state.channels.find((item) => item.id === segments[1]) ?? null;
      if (!channel) {
        return jsonResponse(config, { message: 'Canal nao encontrado.' }, 404);
      }

      channel.status = 'archived';
      channel.archivedAt = new Date().toISOString();
      channel.updatedAt = channel.archivedAt;
      appendLog(state, {
        action: 'CHANNEL_ARCHIVED',
        entity: 'channel',
        context: `Canal ${channel.name} arquivado em modo mock.`,
      });
      return jsonResponse(config, {});
    }

    if (segments.length === 3 && segments[2] === 'posts' && method === 'GET') {
      const posts = sortByNewest(
        (state.channelPosts[segments[1]] ?? []).filter((post) => !post.deletedAt),
        (post) => post.createdAt,
      );
      return jsonResponse(config, paginate(posts, params, 20));
    }

    if (segments.length === 3 && segments[2] === 'posts' && method === 'POST') {
      const channel = state.channels.find((item) => item.id === segments[1]) ?? null;
      if (!channel) {
        return jsonResponse(config, { message: 'Canal nao encontrado.' }, 404);
      }

      const body = readBody<CreateChannelPostRequest>(config.data);
      const post = {
        id: nextId('post'),
        channelId: channel.id,
        authorName: 'Síndico Dev',
        authorUserId: 'dev-user',
        body: body.body.trim(),
        attachmentIds: body.attachmentIds ?? [],
        commentCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      state.channelPosts[channel.id] = [post, ...(state.channelPosts[channel.id] ?? [])];
      appendLog(state, {
        action: 'CHANNEL_POST_CREATED',
        entity: 'channel_post',
        context: `Novo post criado em ${channel.name}.`,
        detailsJson: { postId: post.id, channelId: channel.id },
      });
      return jsonResponse(config, post, 201);
    }

    if (segments.length === 5 && segments[2] === 'posts' && segments[4] === 'delete' && method === 'POST') {
      const posts = state.channelPosts[segments[1]] ?? [];
      const post = posts.find((item) => item.id === segments[3]) ?? null;
      if (!post) {
        return jsonResponse(config, { message: 'Post nao encontrado.' }, 404);
      }

      post.deletedAt = new Date().toISOString();
      post.updatedAt = post.deletedAt;
      appendLog(state, {
        action: 'CHANNEL_POST_DELETED',
        entity: 'channel_post',
        context: `Post ${post.id} removido logicamente em modo mock.`,
      });
      return jsonResponse(config, {});
    }

    if (segments.length === 5 && segments[2] === 'posts' && segments[4] === 'comments' && method === 'GET') {
      const comments = sortByNewest(
        (state.channelComments[segments[3]] ?? []).filter((comment) => !comment.deletedAt),
        (comment) => comment.createdAt,
      );
      return jsonResponse(config, paginate(comments, params, 20));
    }

    if (segments.length === 5 && segments[2] === 'posts' && segments[4] === 'comments' && method === 'POST') {
      const body = readBody<CreateChannelCommentRequest>(config.data);
      const comment = {
        id: nextId('comment'),
        postId: segments[3],
        authorName: 'Síndico Dev',
        authorUserId: 'dev-user',
        body: body.body.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      state.channelComments[segments[3]] = [comment, ...(state.channelComments[segments[3]] ?? [])];
      const post = (state.channelPosts[segments[1]] ?? []).find((item) => item.id === segments[3]) ?? null;
      if (post) {
        post.commentCount = (post.commentCount ?? 0) + 1;
        post.updatedAt = new Date().toISOString();
      }
      appendLog(state, {
        action: 'CHANNEL_COMMENT_CREATED',
        entity: 'channel_comment',
        context: `Comentario criado para o post ${segments[3]} em modo mock.`,
      });
      return jsonResponse(config, comment, 201);
    }

    if (segments.length === 7 && segments[2] === 'posts' && segments[4] === 'comments' && segments[6] === 'delete' && method === 'POST') {
      const comments = state.channelComments[segments[3]] ?? [];
      const comment = comments.find((item) => item.id === segments[5]) ?? null;
      if (!comment) {
        return jsonResponse(config, { message: 'Comentario nao encontrado.' }, 404);
      }

      comment.deletedAt = new Date().toISOString();
      comment.updatedAt = comment.deletedAt;
      return jsonResponse(config, {});
    }

    if (segments.length === 4 && segments[2] === 'moderation' && segments[3] === 'remove-content' && method === 'POST') {
      const body = readBody<RemoveChannelContentRequest>(config.data);
      if (body.contentType === 'POST') {
        const post = (state.channelPosts[segments[1]] ?? []).find((item) => item.id === body.contentId) ?? null;
        if (post) {
          post.deletedAt = new Date().toISOString();
          post.updatedAt = post.deletedAt;
        }
      }
      appendLog(state, {
        action: 'CHANNEL_CONTENT_MODERATED',
        entity: 'channel',
        context: `Moderacao aplicada em ${segments[1]} no modo mock.`,
        detailsJson: body,
      });
      return jsonResponse(config, {});
    }

    if (segments.length === 4 && segments[2] === 'moderation' && segments[3] === 'silence-user' && method === 'POST') {
      const body = readBody<SilenceChannelUserRequest>(config.data);
      appendLog(state, {
        action: 'CHANNEL_USER_SILENCED',
        entity: 'channel',
        context: `Usuario ${body.userId} silenciado localmente no canal ${segments[1]}.`,
        detailsJson: body,
      });
      return jsonResponse(config, {});
    }
  }

  if (segments[0] === 'unit' && segments[1] === 'inbox') {
    if (segments.length === 2 && method === 'GET') {
      const threadId = readString(params?.threadId);
      if (threadId) {
        const thread = state.inboxThreads.find((item) => item.id === threadId) ?? null;
        return jsonResponse(config, {
          data: thread ? [thread] : [],
          selectedThread: thread,
          messages: thread ? state.inboxMessages[thread.id] ?? [] : [],
          pagination: {
            page: 1,
            limit: 1,
            total: thread ? 1 : 0,
            totalPages: 1,
          },
        });
      }

      const search = readString(params?.search);
      const status = readString(params?.status);
      const unitId = readString(params?.unitId);
      const rows = sortByNewest(
        state.inboxThreads.filter((thread) =>
          (!status || thread.status === status)
          && (!unitId || thread.unitId === unitId)
          && includesSearch(search, thread.subject, thread.lastMessage, thread.unitLabel),
        ),
        (thread) => thread.updatedAt,
      );
      return jsonResponse(config, paginate(rows, params, 12));
    }

    if (segments.length === 3 && segments[2] === 'messages' && method === 'POST') {
      const body = readBody<{ threadId: string; message: string; attachmentIds?: string[] }>(config.data);
      const thread = state.inboxThreads.find((item) => item.id === body.threadId) ?? null;
      if (!thread) {
        return jsonResponse(config, { message: 'Thread nao encontrada.' }, 404);
      }

      const message: InboxMessage = {
        id: nextId('inbox-msg'),
        threadId: thread.id,
        authorName: 'Síndico Dev',
        authorUserId: 'dev-user',
        message: body.message.trim(),
        isFromAdmin: true,
        attachmentIds: body.attachmentIds ?? [],
        createdAt: new Date().toISOString(),
      };
      state.inboxMessages[thread.id] = [...(state.inboxMessages[thread.id] ?? []), message];
      thread.lastMessage = message.message;
      thread.lastMessageAt = message.createdAt;
      thread.updatedAt = message.createdAt;
      if (thread.status === 'ABERTO') {
        thread.status = 'EM_ATENDIMENTO';
      }
      appendLog(state, {
        action: 'INBOX_MESSAGE_SENT',
        entity: 'inbox_thread',
        context: `Resposta enviada para a thread ${thread.id} em modo mock.`,
        unitId: thread.unitId ?? null,
        unitLabel: thread.unitLabel ?? null,
      });
      return jsonResponse(config, message, 201);
    }

    if (segments.length === 3 && segments[2] === 'status' && method === 'POST') {
      const body = readBody<{ threadId: string; status: InboxStatus }>(config.data);
      const thread = state.inboxThreads.find((item) => item.id === body.threadId) ?? null;
      if (!thread) {
        return jsonResponse(config, { message: 'Thread nao encontrada.' }, 404);
      }

      thread.status = body.status;
      thread.updatedAt = new Date().toISOString();
      appendLog(state, {
        action: 'INBOX_STATUS_UPDATED',
        entity: 'inbox_thread',
        context: `Status da thread ${thread.id} atualizado para ${body.status}.`,
        unitId: thread.unitId ?? null,
        unitLabel: thread.unitLabel ?? null,
      });
      return jsonResponse(config, {});
    }
  }

  if (segments[0] === 'tickets') {
    if (segments.length === 1 && method === 'GET') {
      const search = readString(params?.search);
      const status = readString(params?.status);
      const unitId = readString(params?.unitId);
      const assignedTo = readString(params?.assignedTo);
      const overdue = readBoolean(params?.overdue);
      const rows = sortByNewest(
        state.tickets.filter((ticket) =>
          (!status || ticket.status === status)
          && (!unitId || ticket.unitId === unitId)
          && (!assignedTo || ticket.assignee?.id === assignedTo)
          && (!overdue || ticket.overdue)
          && includesSearch(search, ticket.title, ticket.description, ticket.category, ticket.location, ticket.unitLabel),
        ),
        (ticket) => ticket.updatedAt ?? ticket.createdAt,
      );
      return jsonResponse(config, paginate(rows, params));
    }

    if (segments.length === 1 && method === 'POST') {
      const body = readBody<CreateTicketRequest>(config.data);
      const unit = findUnit(state, body.unitId);
      const ticket = {
        id: nextId('ticket'),
        title: body.category?.trim() || `Ticket ${state.tickets.length + 1}`,
        category: body.category?.trim() || null,
        location: body.location?.trim() || null,
        description: body.description.trim(),
        status: 'ABERTO',
        priority: 'MEDIA',
        unitId: unit?.id ?? null,
        unitLabel: unit ? `${unit.block.name} - ${unit.number}` : null,
        unit: { id: unit?.id ?? null, label: unit ? `${unit.block.name} - ${unit.number}` : null },
        assignee: { id: null, name: null, role: null },
        dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        overdue: false,
        attachmentIds: body.attachmentIds ?? [],
      };
      state.tickets.unshift(ticket);
      state.ticketMessages[ticket.id] = [];
      state.ticketStatusHistory[ticket.id] = [
        {
          id: nextId('ticket-status'),
          fromStatus: null,
          toStatus: 'ABERTO',
          actorName: 'Síndico Dev',
          createdAt: ticket.createdAt,
          reason: 'Chamado criado localmente em modo mock.',
        },
      ];
      appendLog(state, {
        action: 'TICKET_CREATED',
        entity: 'ticket',
        context: `Ticket ${ticket.id} criado em modo mock.`,
        unitId: ticket.unitId,
        unitLabel: ticket.unitLabel,
        detailsJson: ticket,
      });
      return jsonResponse(config, ticket, 201);
    }

    if (segments.length === 2 && method === 'GET') {
      const ticket = state.tickets.find((item) => item.id === segments[1]) ?? null;
      return jsonResponse(config, {
        ticket,
        messages: ticket ? state.ticketMessages[ticket.id] ?? [] : [],
        statusHistory: ticket ? state.ticketStatusHistory[ticket.id] ?? [] : [],
      });
    }

    if (segments.length === 3 && segments[2] === 'messages' && method === 'POST') {
      const ticket = state.tickets.find((item) => item.id === segments[1]) ?? null;
      if (!ticket) {
        return jsonResponse(config, { message: 'Ticket nao encontrado.' }, 404);
      }

      const body = readBody<SendTicketMessageRequest>(config.data);
      const message = {
        id: nextId('ticket-msg'),
        message: body.message.trim(),
        authorName: 'Síndico Dev',
        authorRole: 'SINDICO_ADMIN',
        createdAt: new Date().toISOString(),
        attachmentIds: body.attachmentId ? [body.attachmentId] : [],
      };
      state.ticketMessages[ticket.id] = [...(state.ticketMessages[ticket.id] ?? []), message];
      ticket.updatedAt = message.createdAt;
      appendLog(state, {
        action: 'TICKET_MESSAGE_SENT',
        entity: 'ticket',
        context: `Mensagem enviada para o ticket ${ticket.id}.`,
        unitId: ticket.unitId,
        unitLabel: ticket.unitLabel,
      });
      return jsonResponse(config, message, 201);
    }

    if (segments.length === 3 && segments[2] === 'assign' && method === 'POST') {
      const ticket = state.tickets.find((item) => item.id === segments[1]) ?? null;
      if (!ticket) {
        return jsonResponse(config, { message: 'Ticket nao encontrado.' }, 404);
      }

      const body = readBody<AssignTicketRequest>(config.data);
      const assignee = findStaff(state, body.userId);
      ticket.assignee = {
        id: assignee?.id ?? null,
        name: assignee?.name ?? null,
        role: assignee?.role ?? null,
      };
      ticket.updatedAt = new Date().toISOString();
      appendLog(state, {
        action: 'TICKET_ASSIGNED',
        entity: 'ticket',
        context: `Ticket ${ticket.id} atribuido em modo mock.`,
        unitId: ticket.unitId,
        unitLabel: ticket.unitLabel,
        detailsJson: { assigneeId: body.userId },
      });
      return jsonResponse(config, {});
    }

    if (segments.length === 3 && segments[2] === 'status' && method === 'POST') {
      const ticket = state.tickets.find((item) => item.id === segments[1]) ?? null;
      if (!ticket) {
        return jsonResponse(config, { message: 'Ticket nao encontrado.' }, 404);
      }

      const body = readBody<UpdateTicketStatusRequest>(config.data);
      const previousStatus = ticket.status;
      ticket.status = body.status;
      ticket.updatedAt = new Date().toISOString();
      state.ticketStatusHistory[ticket.id] = [
        ...(state.ticketStatusHistory[ticket.id] ?? []),
        {
          id: nextId('ticket-status'),
          fromStatus: previousStatus,
          toStatus: body.status,
          actorName: 'Síndico Dev',
          createdAt: ticket.updatedAt,
          reason: 'Status ajustado localmente no modo mock.',
        },
      ];
      appendLog(state, {
        action: 'TICKET_STATUS_UPDATED',
        entity: 'ticket',
        context: `Ticket ${ticket.id} atualizado para ${body.status}.`,
        unitId: ticket.unitId,
        unitLabel: ticket.unitLabel,
      });
      return jsonResponse(config, {});
    }

    if (segments.length === 3 && segments[2] === 'reopen' && method === 'POST') {
      const ticket = state.tickets.find((item) => item.id === segments[1]) ?? null;
      if (!ticket) {
        return jsonResponse(config, { message: 'Ticket nao encontrado.' }, 404);
      }

      const body = readBody<ReopenTicketRequest>(config.data);
      const previousStatus = ticket.status;
      ticket.status = 'REABERTO';
      ticket.updatedAt = new Date().toISOString();
      state.ticketStatusHistory[ticket.id] = [
        ...(state.ticketStatusHistory[ticket.id] ?? []),
        {
          id: nextId('ticket-status'),
          fromStatus: previousStatus,
          toStatus: 'REABERTO',
          actorName: 'Síndico Dev',
          createdAt: ticket.updatedAt,
          reason: body.reason?.trim() || 'Ticket reaberto localmente no modo mock.',
        },
      ];
      appendLog(state, {
        action: 'TICKET_REOPENED',
        entity: 'ticket',
        context: `Ticket ${ticket.id} reaberto em modo mock.`,
        unitId: ticket.unitId,
        unitLabel: ticket.unitLabel,
      });
      return jsonResponse(config, {});
    }
  }

  if (segments[0] === 'deliveries') {
    if (segments.length === 1 && method === 'GET') {
      const search = readString(params?.search);
      const status = readString(params?.status);
      const rows = sortByNewest(
        state.deliveries.filter((delivery) =>
          (!status || delivery.status === status)
          && includesSearch(search, delivery.code, delivery.recipientName, delivery.unitLabel, delivery.courierName),
        ),
        (delivery) => delivery.updatedAt ?? delivery.createdAt,
      );
      return jsonResponse(config, paginate(rows, params, 12));
    }

    if (segments.length === 2 && segments[1] === 'queue' && method === 'GET') {
      return jsonResponse(config, buildQueuePayload(state));
    }

    if (segments.length === 1 && method === 'POST') {
      const body = readBody<CreateDeliveryRequest>(config.data);
      const unit = findUnit(state, body.unitId);
      if (!unit) {
        return jsonResponse(config, { message: 'Unidade nao encontrada.' }, 404);
      }

      const delivery = {
        id: nextId('delivery'),
        code: `ENC-${Math.floor(Math.random() * 9000) + 1000}`,
        unitId: unit.id,
        unitLabel: `${unit.block.name} - ${unit.number}`,
        recipientName: body.recipientName?.trim() || `Morador ${unit.number}`,
        courierUserId: null,
        courierName: null,
        deliveredToName: null,
        failureReason: null,
        status: 'CHEGOU',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        attachmentIds: body.attachmentIdEvidence ? [body.attachmentIdEvidence] : [],
      } satisfies DeliverySummary;
      state.deliveries.unshift(delivery);
      state.deliveryEvents[delivery.id] = [
        {
          id: nextId('delivery-event'),
          type: 'RECEIVED',
          description: 'Chegada registrada localmente em modo mock.',
          actorName: 'Síndico Dev',
          createdAt: delivery.createdAt,
          attachmentIds: delivery.attachmentIds,
        },
      ];
      appendLog(state, {
        action: 'DELIVERY_CREATED',
        entity: 'delivery',
        context: `Entrega ${delivery.code} registrada em modo mock.`,
        unitId: delivery.unitId,
        unitLabel: delivery.unitLabel,
      });
      return jsonResponse(config, delivery, 201);
    }

    if (segments.length === 2 && method === 'GET') {
      const delivery = state.deliveries.find((item) => item.id === segments[1]) ?? null;
      return jsonResponse(config, {
        delivery,
        events: delivery ? state.deliveryEvents[delivery.id] ?? [] : [],
      });
    }

    if (segments.length === 3 && segments[2] === 'assign' && method === 'POST') {
      const delivery = state.deliveries.find((item) => item.id === segments[1]) ?? null;
      if (!delivery) {
        return jsonResponse(config, { message: 'Entrega nao encontrada.' }, 404);
      }

      const body = readBody<AssignDeliveryRequest>(config.data);
      const courier = findStaff(state, body.userId);
      delivery.courierUserId = courier?.id ?? null;
      delivery.courierName = courier?.name ?? null;
      delivery.status = 'EM_DISTRIBUICAO';
      delivery.updatedAt = new Date().toISOString();
      state.deliveryEvents[delivery.id] = [
        ...(state.deliveryEvents[delivery.id] ?? []),
        {
          id: nextId('delivery-event'),
          type: 'ASSIGNED',
          description: 'Entrega atribuida para distribuicao local.',
          actorName: courier?.name ?? 'Síndico Dev',
          createdAt: delivery.updatedAt,
          attachmentIds: [],
        },
      ];
      appendLog(state, {
        action: 'DELIVERY_ASSIGNED',
        entity: 'delivery',
        context: `Entrega ${delivery.code} atribuida em modo mock.`,
        unitId: delivery.unitId,
        unitLabel: delivery.unitLabel,
      });
      return jsonResponse(config, {});
    }

    if (segments.length === 3 && segments[2] === 'complete' && method === 'POST') {
      const delivery = state.deliveries.find((item) => item.id === segments[1]) ?? null;
      if (!delivery) {
        return jsonResponse(config, { message: 'Entrega nao encontrada.' }, 404);
      }

      const body = readBody<CompleteDeliveryRequest>(config.data);
      delivery.status = 'ENTREGUE';
      delivery.deliveredToName = body.deliveredToName?.trim() || delivery.recipientName;
      if (body.evidenceAttachmentId) {
        delivery.attachmentIds = [...delivery.attachmentIds, body.evidenceAttachmentId];
      }
      delivery.updatedAt = new Date().toISOString();
      state.deliveryEvents[delivery.id] = [
        ...(state.deliveryEvents[delivery.id] ?? []),
        {
          id: nextId('delivery-event'),
          type: 'COMPLETED',
          description: `Entrega concluida com QR ${body.qrToken}.`,
          actorName: delivery.courierName ?? 'Síndico Dev',
          createdAt: delivery.updatedAt,
          attachmentIds: body.evidenceAttachmentId ? [body.evidenceAttachmentId] : [],
        },
      ];
      appendLog(state, {
        action: 'DELIVERY_COMPLETED',
        entity: 'delivery',
        context: `Entrega ${delivery.code} concluida em modo mock.`,
        unitId: delivery.unitId,
        unitLabel: delivery.unitLabel,
      });
      return jsonResponse(config, {});
    }

    if (segments.length === 3 && segments[2] === 'fail' && method === 'POST') {
      const delivery = state.deliveries.find((item) => item.id === segments[1]) ?? null;
      if (!delivery) {
        return jsonResponse(config, { message: 'Entrega nao encontrada.' }, 404);
      }

      const body = readBody<FailDeliveryRequest>(config.data);
      delivery.status = 'NAO_ENTREGUE';
      delivery.failureReason = body.reason.trim();
      if (body.evidenceAttachmentId) {
        delivery.attachmentIds = [...delivery.attachmentIds, body.evidenceAttachmentId];
      }
      delivery.updatedAt = new Date().toISOString();
      state.deliveryEvents[delivery.id] = [
        ...(state.deliveryEvents[delivery.id] ?? []),
        {
          id: nextId('delivery-event'),
          type: 'FAILED',
          description: body.reason.trim(),
          actorName: delivery.courierName ?? 'Síndico Dev',
          createdAt: delivery.updatedAt,
          attachmentIds: body.evidenceAttachmentId ? [body.evidenceAttachmentId] : [],
        },
      ];
      appendLog(state, {
        action: 'DELIVERY_FAILED',
        entity: 'delivery',
        context: `Entrega ${delivery.code} marcada como falha em modo mock.`,
        unitId: delivery.unitId,
        unitLabel: delivery.unitLabel,
      });
      return jsonResponse(config, {});
    }
  }

  if (segments[0] === 'turns') {
    if (segments.length === 2 && segments[1] === 'start' && method === 'POST') {
      if (!state.currentTurn?.isOpen) {
        state.currentTurn = {
          id: nextId('turn'),
          actorName: 'Síndico Dev',
          startedAt: new Date().toISOString(),
          endedAt: null,
          isOpen: true,
        };
        state.turnHistory = [state.currentTurn, ...state.turnHistory.filter((turn) => turn.id !== state.currentTurn?.id)];
      }
      appendLog(state, {
        action: 'TURN_STARTED',
        entity: 'turn',
        context: 'Turno iniciado localmente em modo mock.',
      });
      return jsonResponse(config, buildQueuePayload(state));
    }

    if (segments.length === 2 && segments[1] === 'end' && method === 'POST') {
      if (state.currentTurn?.isOpen) {
        state.currentTurn.endedAt = new Date().toISOString();
        state.currentTurn.isOpen = false;
      }
      appendLog(state, {
        action: 'TURN_ENDED',
        entity: 'turn',
        context: 'Turno encerrado localmente em modo mock.',
      });
      return jsonResponse(config, buildQueuePayload(state));
    }
  }

  if (segments[0] === 'logs' && method === 'GET') {
    const search = readString(params?.search);
    const unitId = readString(params?.unitId);
    const action = readString(params?.action);
    const actor = readString(params?.actor);
    const startDate = readString(params?.startDate);
    const endDate = readString(params?.endDate);

    const rows = sortByNewest(
      state.logs.filter((log) => {
        const logTime = log.createdAt ? new Date(log.createdAt).getTime() : 0;
        const startTime = startDate ? new Date(startDate).getTime() : Number.NEGATIVE_INFINITY;
        const endTime = endDate ? new Date(endDate).getTime() : Number.POSITIVE_INFINITY;

        return (!unitId || log.unitId === unitId)
          && (!action || log.action === action)
          && (!actor || includesSearch(actor, log.actorName, log.actorId))
          && includesSearch(search, log.action, log.entity, log.context, log.unitLabel, log.actorName)
          && logTime >= startTime
          && logTime <= endTime;
      }),
      (log) => log.createdAt,
    );

    return jsonResponse(config, paginate(rows, params, 20));
  }

  if (segments[0] === 'uploads') {
    if (segments.length === 2 && segments[1] === 'presign' && method === 'POST') {
      const body = readBody<{ filename?: string }>(config.data);
      return jsonResponse(config, await handleMockUpload(instanceKey, body.filename ?? 'arquivo-mock'));
    }

    if (segments.length === 2 && segments[1] === 'complete' && method === 'POST') {
      return jsonResponse(config, {}, 204);
    }
  }

  if (segments[0] === 'attachments' && segments.length === 3 && segments[2] === 'url' && method === 'GET') {
    const url = resolveDevAttachmentUrl(instanceKey, segments[1]);
    if (!url) {
      return jsonResponse(config, { message: 'Anexo nao encontrado.' }, 404);
    }
    return jsonResponse(config, { url });
  }

  return null;
}

function shouldReturnInstanceSelection(credentials: LoginCredentials) {
  return credentials.email.trim().toLowerCase().includes('multi');
}

function buildSelectionToken(credentials: LoginCredentials) {
  return credentials.email.trim().toLowerCase().includes('expired')
    ? DEV_EXPIRED_SELECTION_TOKEN
    : DEV_SELECTION_TOKEN;
}

function handleGlobalLogin(config: InternalAxiosRequestConfig) {
  const credentials = readBody<LoginCredentials>(config.data);

  if (shouldReturnInstanceSelection(credentials)) {
    return jsonResponse(config, {
      requiresInstanceSelection: true,
      selectionToken: buildSelectionToken(credentials),
      options: DEV_SELECTION_OPTIONS,
    });
  }

  return jsonResponse(config, createDevTenantSession());
}

function handleSelectInstance(config: InternalAxiosRequestConfig) {
  const body = readBody<SelectInstanceRequest>(config.data);

  if (body.selectionToken === DEV_EXPIRED_SELECTION_TOKEN) {
    return jsonResponse(
      config,
      {
        code: 'INVALID_SELECTION_TOKEN',
        message: 'Token de seleção expirado.',
      },
      401,
    );
  }

  const option = DEV_SELECTION_OPTIONS.find((item) => item.instanceId === body.instanceId);

  if (body.selectionToken !== DEV_SELECTION_TOKEN || !option) {
    return jsonResponse(
      config,
      {
        code: 'INSTANCE_SELECTION_NOT_ALLOWED',
        message: 'Seleção de condomínio não permitida.',
      },
      403,
    );
  }

  return jsonResponse(config, createDevTenantSession(option.instanceKey));
}

async function routeMockRequest(
  config: InternalAxiosRequestConfig,
): Promise<AxiosResponse | null> {
  const resolvedUrl = new URL(config.url ?? '', config.baseURL ?? window.location.origin);
  const segments = resolvedUrl.pathname.split('/').filter(Boolean);
  const method = (config.method ?? 'get').toUpperCase();

  if (segments[0] !== 'api' || segments[1] !== 'v1') {
    return null;
  }

  if (segments[2] === 'auth' && segments[3] === 'refresh') {
    return jsonResponse(config, createDevTenantSession());
  }

  if (segments[2] === 'auth' && segments[3] === 'login' && method === 'POST') {
    return handleGlobalLogin(config);
  }

  if (segments[2] === 'auth' && segments[3] === 'select-instance' && method === 'POST') {
    return handleSelectInstance(config);
  }

  const instanceKey = segments[2];
  if (!instanceKey) {
    return jsonResponse(config, { message: 'Instance key is required.' }, 400);
  }

  return handleInstanceApi(config, instanceKey, segments.slice(3));
}

export function createDevMockAdapter(): AxiosAdapter {
  return async (config) => {
    const mockResponse = await routeMockRequest(config);

    await sleep();

    return mockResponse ?? jsonResponse(
      config,
      {
        message: 'Real network access is disabled while full mock mode is active.',
      },
      503,
    );
  };
}

export async function uploadAttachmentInDevMode(instanceKey: string, file: File) {
  await sleep(120);
  return registerDevAttachmentUpload(instanceKey, file);
}
