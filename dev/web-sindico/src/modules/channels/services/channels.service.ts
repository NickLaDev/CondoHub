import { http } from '@/services/http';
import { normalizePaginatedResponse } from '@/services/pagination';
import type {
  Channel,
  ChannelResponse,
  CreateChannelRequest,
  UpdateChannelRequest,
} from '@/modules/channels/types';

export async function getChannels(
  instanceKey: string,
  params?: { page?: number; limit?: number; search?: string },
): Promise<ChannelResponse> {
  const response = await http.get<ChannelResponse>(`/api/v1/${instanceKey}/channels`, {
    params,
    tenantKey: instanceKey,
  });

  return normalizePaginatedResponse<Channel>(response.data);
}

export async function createChannel(
  instanceKey: string,
  data: CreateChannelRequest,
): Promise<Channel> {
  const response = await http.post<Channel>(`/api/v1/${instanceKey}/channels`, data, {
    tenantKey: instanceKey,
  });
  return response.data;
}

export async function updateChannel(
  instanceKey: string,
  id: string,
  data: UpdateChannelRequest,
): Promise<Channel> {
  const response = await http.patch<Channel>(`/api/v1/${instanceKey}/channels/${id}`, data, {
    tenantKey: instanceKey,
  });
  return response.data;
}

export async function archiveChannel(instanceKey: string, id: string): Promise<void> {
  await http.post(`/api/v1/${instanceKey}/channels/${id}/archive`, null, {
    tenantKey: instanceKey,
  });
}
