import type { PaginatedResponse } from '@/services/pagination';

export interface InstanceLogEntry {
  id: string;
  createdAt: string | null;
  actorName: string | null;
  actorId: string | null;
  action: string;
  entity: string | null;
  requestId: string | null;
  unitId: string | null;
  unitLabel: string | null;
  context: string | null;
  detailsJson: unknown;
  ip: string | null;
  userAgent: string | null;
}

export type LogsResponse = PaginatedResponse<InstanceLogEntry>;

export interface LogsQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  unitId?: string;
  action?: string;
  actor?: string;
  startDate?: string;
  endDate?: string;
}
