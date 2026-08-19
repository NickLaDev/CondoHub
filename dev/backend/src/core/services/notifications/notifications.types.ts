import { RequestContext } from '../../contract/requestContext';

export const PUSH_PLATFORMS = ['android', 'ios', 'web'] as const;
export type PushPlatform = (typeof PUSH_PLATFORMS)[number];

export interface RegisterInput {
  token: string;
  platform: PushPlatform;
}

export interface NotificationEvent {
  type: string;
  instanceId: string;
  targetUserIds?: string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export interface NotificationService {
  register(ctx: RequestContext, input: RegisterInput): Promise<{ ok: true }>;
  enqueue(event: NotificationEvent): Promise<void>;
}
