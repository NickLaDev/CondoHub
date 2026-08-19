import type { PaginatedResponse } from '@/services/pagination';

export type DeliveryStatus =
  | 'CHEGOU'
  | 'EM_DISTRIBUICAO'
  | 'ENTREGUE'
  | 'NAO_ENTREGUE'
  | string;

export interface DeliverySummary {
  id: string;
  code: string;
  unitId: string | null;
  unitLabel: string | null;
  recipientName: string;
  courierUserId: string | null;
  courierName: string | null;
  deliveredToName: string | null;
  failureReason: string | null;
  status: DeliveryStatus;
  createdAt: string;
  updatedAt: string | null;
  attachmentIds: string[];
}

export interface DeliveryEvent {
  id: string;
  type: string;
  description: string;
  actorName: string | null;
  createdAt: string;
  attachmentIds: string[];
}

export type DeliveriesResponse = PaginatedResponse<DeliverySummary>;

export interface DeliveryQueueResponse {
  data: DeliverySummary[];
  unavailable?: boolean;
}

export interface DeliveryDetailResponse {
  delivery: DeliverySummary | null;
  events: DeliveryEvent[];
}

export interface DeliveryListParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

export interface CreateDeliveryRequest {
  unitId: string;
  recipientName?: string;
  attachmentIdEvidence?: string;
}

export interface AssignDeliveryRequest {
  userId: string;
}

export interface CompleteDeliveryRequest {
  qrToken: string;
  evidenceAttachmentId?: string;
  deliveredToName?: string;
  deliveredToUserId?: string;
}

export interface FailDeliveryRequest {
  reason: string;
  evidenceAttachmentId?: string;
}
