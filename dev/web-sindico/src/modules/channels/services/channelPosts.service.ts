import { http } from '@/services/http';
import {
  createEmptyPaginatedResponse,
  normalizePaginatedResponse,
} from '@/services/pagination';
import { getHttpStatus } from '@/services/errors';
import type {
  ChannelComment,
  ChannelCommentsResponse,
  ChannelPost,
  ChannelPostsParams,
  ChannelPostsResponse,
  CreateChannelCommentRequest,
  CreateChannelPostRequest,
  RemoveChannelContentRequest,
  SilenceChannelUserRequest,
  UpdateChannelCommentRequest,
  UpdateChannelPostRequest,
} from '@/modules/channels/types';

function isSubresourceUnavailable(error: unknown) {
  const status = getHttpStatus(error);
  return status === 404 || status === 405 || status === 501;
}

function unavailablePostsResponse(limit = 10): ChannelPostsResponse {
  return {
    ...createEmptyPaginatedResponse<ChannelPost>({
      limit,
    }),
    unavailable: true,
  };
}

function unavailableCommentsResponse(limit = 10): ChannelCommentsResponse {
  return {
    ...createEmptyPaginatedResponse<ChannelComment>({
      limit,
    }),
    unavailable: true,
  };
}

export async function getChannelPosts(
  instanceKey: string,
  channelId: string,
  params?: ChannelPostsParams,
): Promise<ChannelPostsResponse> {
  try {
    const response = await http.get(
      `/api/v1/${instanceKey}/channels/${channelId}/posts`,
      {
        params,
        tenantKey: instanceKey,
      },
    );

    return normalizePaginatedResponse<ChannelPost>(response.data, {
      dataKeys: ['data', 'items', 'posts'],
      defaultLimit: params?.limit,
    });
  } catch (error) {
    if (isSubresourceUnavailable(error)) {
      return unavailablePostsResponse(params?.limit);
    }

    throw error;
  }
}

export async function createChannelPost(
  instanceKey: string,
  channelId: string,
  data: CreateChannelPostRequest,
): Promise<ChannelPost> {
  const response = await http.post<ChannelPost>(
    `/api/v1/${instanceKey}/channels/${channelId}/posts`,
    data,
    {
      tenantKey: instanceKey,
    },
  );
  return response.data;
}

export async function updateChannelPost(
  instanceKey: string,
  channelId: string,
  postId: string,
  data: UpdateChannelPostRequest,
): Promise<ChannelPost> {
  const response = await http.patch<ChannelPost>(
    `/api/v1/${instanceKey}/channels/${channelId}/posts/${postId}`,
    data,
    { tenantKey: instanceKey },
  );
  return response.data;
}

export async function deleteChannelPost(
  instanceKey: string,
  channelId: string,
  postId: string,
): Promise<void> {
  await http.post(
    `/api/v1/${instanceKey}/channels/${channelId}/posts/${postId}/delete`,
    null,
    {
      tenantKey: instanceKey,
    },
  );
}

export async function getComments(
  instanceKey: string,
  channelId: string,
  postId: string,
  params?: ChannelPostsParams,
): Promise<ChannelCommentsResponse> {
  try {
    const response = await http.get(
      `/api/v1/${instanceKey}/channels/${channelId}/posts/${postId}/comments`,
      {
        params,
        tenantKey: instanceKey,
      },
    );

    return normalizePaginatedResponse<ChannelComment>(response.data, {
      dataKeys: ['data', 'items', 'comments'],
      defaultLimit: params?.limit,
    });
  } catch (error) {
    if (isSubresourceUnavailable(error)) {
      return unavailableCommentsResponse(params?.limit);
    }

    throw error;
  }
}

export async function createComment(
  instanceKey: string,
  channelId: string,
  postId: string,
  data: CreateChannelCommentRequest,
): Promise<ChannelComment> {
  const response = await http.post<ChannelComment>(
    `/api/v1/${instanceKey}/channels/${channelId}/posts/${postId}/comments`,
    data,
    { tenantKey: instanceKey },
  );
  return response.data;
}

export async function updateChannelComment(
  instanceKey: string,
  channelId: string,
  postId: string,
  commentId: string,
  data: UpdateChannelCommentRequest,
): Promise<ChannelComment> {
  const response = await http.patch<ChannelComment>(
    `/api/v1/${instanceKey}/channels/${channelId}/posts/${postId}/comments/${commentId}`,
    data,
    { tenantKey: instanceKey },
  );
  return response.data;
}

export async function deleteChannelComment(
  instanceKey: string,
  channelId: string,
  postId: string,
  commentId: string,
): Promise<void> {
  await http.post(
    `/api/v1/${instanceKey}/channels/${channelId}/posts/${postId}/comments/${commentId}/delete`,
    null,
    { tenantKey: instanceKey },
  );
}

export async function silenceChannelUser(
  instanceKey: string,
  channelId: string,
  data: SilenceChannelUserRequest,
): Promise<void> {
  await http.post(
    `/api/v1/${instanceKey}/channels/${channelId}/moderation/silence-user`,
    data,
    { tenantKey: instanceKey },
  );
}

export async function removeChannelContent(
  instanceKey: string,
  channelId: string,
  data: RemoveChannelContentRequest,
): Promise<void> {
  await http.post(
    `/api/v1/${instanceKey}/channels/${channelId}/moderation/remove-content`,
    data,
    { tenantKey: instanceKey },
  );
}
