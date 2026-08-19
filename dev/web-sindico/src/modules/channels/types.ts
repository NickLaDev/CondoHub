import type { PaginatedResponse } from '@/services/pagination';

export type ChannelStatus = 'active' | 'archived';
export type ChannelVisibility = 'PUBLIC' | 'PRIVATE' | string;

export interface Channel {
  id: string;
  name: string;
  description?: string | null;
  visibility?: ChannelVisibility;
  archivedAt?: string | null;
  status?: ChannelStatus;
  createdAt: string;
  updatedAt: string;
}

export type ChannelResponse = PaginatedResponse<Channel>;

export interface CreateChannelRequest {
  name: string;
  description?: string;
  visibility?: ChannelVisibility;
}

export interface UpdateChannelRequest {
  name?: string;
  description?: string;
  visibility?: ChannelVisibility;
}

export interface ChannelPost {
  id: string;
  channelId: string;
  author?: string;
  authorName?: string | null;
  authorUserId?: string | null;
  body?: string;
  text?: string;
  attachmentIds?: string[];
  deletedAt?: string | null;
  commentCount?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface ChannelComment {
  id: string;
  postId: string;
  author?: string;
  authorName?: string | null;
  authorUserId?: string | null;
  body?: string;
  text?: string;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface ChannelPostsResponse extends PaginatedResponse<ChannelPost> {
  unavailable?: boolean;
}

export interface ChannelCommentsResponse extends PaginatedResponse<ChannelComment> {
  unavailable?: boolean;
}

export interface ChannelPostsParams {
  page?: number;
  limit?: number;
}

export interface CreateChannelPostRequest {
  body: string;
  attachmentIds?: string[];
}

export interface UpdateChannelPostRequest {
  body?: string;
}

export interface CreateChannelCommentRequest {
  body: string;
}

export interface UpdateChannelCommentRequest {
  body?: string;
}

export interface SilenceChannelUserRequest {
  userId: string;
  minutes?: number;
  reason?: string;
}

export interface RemoveChannelContentRequest {
  contentType: 'POST' | 'COMMENT';
  contentId: string;
  reason?: string;
}
