import { http } from '@/services/http';
import { normalizePaginatedResponse } from '@/services/pagination';
import type {
  Announcement,
  AnnouncementListParams,
  AnnouncementsResponse,
  CreateAnnouncementRequest,
  UpdateAnnouncementRequest,
} from '@/modules/announcements/types';

export async function getAnnouncements(
  instanceKey: string,
  params?: AnnouncementListParams,
): Promise<AnnouncementsResponse> {
  const response = await http.get<AnnouncementsResponse>(`/api/v1/${instanceKey}/announcements`, {
    params,
    tenantKey: instanceKey,
  });
  return normalizePaginatedResponse<Announcement>(response.data);
}

export async function getAnnouncement(instanceKey: string, id: string): Promise<Announcement> {
  const response = await http.get<Announcement>(`/api/v1/${instanceKey}/announcements/${id}`, {
    tenantKey: instanceKey,
  });
  return response.data;
}

export async function createAnnouncement(
  instanceKey: string,
  data: CreateAnnouncementRequest,
): Promise<Announcement> {
  const response = await http.post<Announcement>(`/api/v1/${instanceKey}/announcements`, data, {
    tenantKey: instanceKey,
  });
  return response.data;
}

export async function updateAnnouncement(
  instanceKey: string,
  id: string,
  data: UpdateAnnouncementRequest,
): Promise<Announcement> {
  const response = await http.patch<Announcement>(`/api/v1/${instanceKey}/announcements/${id}`, data, {
    tenantKey: instanceKey,
  });
  return response.data;
}

export async function archiveAnnouncement(instanceKey: string, id: string): Promise<void> {
  await http.post(`/api/v1/${instanceKey}/announcements/${id}/archive`, null, {
    tenantKey: instanceKey,
  });
}

export async function acknowledgeAnnouncement(instanceKey: string, id: string): Promise<void> {
  await http.post(`/api/v1/${instanceKey}/announcements/${id}/ack`, null, {
    tenantKey: instanceKey,
  });
}
