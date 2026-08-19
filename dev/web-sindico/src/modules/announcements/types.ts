import type { PaginatedResponse } from '@/services/pagination';

export type AnnouncementStatus = 'active' | 'archived';

export interface AnnouncementAcknowledgement {
  id: string;
  unitId?: string | null;
  unitLabel?: string | null;
  userId?: string | null;
  userName?: string | null;
  ackAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  requireAck: boolean;
  archived?: boolean;
  archivedAt?: string | null;
  attachmentIds?: string[];
  ackCount?: number;
  totalAckRequired?: number;
  acknowledgements?: AnnouncementAcknowledgement[];
  createdAt: string;
  updatedAt: string;
}

export interface AnnouncementListParams {
  page?: number;
  limit?: number;
  search?: string;
  archived?: boolean;
  requireAck?: boolean;
}

export interface CreateAnnouncementRequest {
  title: string;
  body: string;
  requireAck: boolean;
  attachmentIds?: string[];
}

export interface UpdateAnnouncementRequest {
  title?: string;
  body?: string;
  requireAck?: boolean;
  attachmentIds?: string[];
}

export type AnnouncementsResponse = PaginatedResponse<Announcement>;
