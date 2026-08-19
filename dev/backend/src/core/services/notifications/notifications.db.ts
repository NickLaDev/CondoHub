import { Errors } from '../../contract/errors';
import { RequestContext } from '../../contract/requestContext';
import { registerPushToken } from '../../db/repos/pushTokensRepo';
import {
  NotificationEvent,
  NotificationService,
  PUSH_PLATFORMS,
  PushPlatform,
  RegisterInput,
} from './notifications.types';

function parsePushPlatform(rawPlatform: string): PushPlatform {
  const normalized = rawPlatform.trim().toLowerCase();
  if ((PUSH_PLATFORMS as readonly string[]).includes(normalized)) {
    return normalized as PushPlatform;
  }

  throw Errors.validationError({
    platform: `Must be one of: ${PUSH_PLATFORMS.join(', ')}`,
  });
}

export class DbNotificationService implements NotificationService {
  async register(ctx: RequestContext, input: RegisterInput): Promise<{ ok: true }> {
    if (!ctx.instanceId) {
      throw Errors.tenantRequired();
    }

    const actorUserId = ctx.actor?.userId;
    if (!actorUserId) {
      throw Errors.authRequired();
    }

    const token = input.token.trim();
    if (!token) {
      throw Errors.validationError({
        token: 'Token is required',
      });
    }

    const platform = parsePushPlatform(input.platform);

    await registerPushToken({
      instanceId: ctx.instanceId,
      userId: actorUserId,
      platform,
      token,
    });

    return { ok: true };
  }

  async enqueue(event: NotificationEvent): Promise<void> {
    console.log('[NOTIFICATION-DB] enqueue:', event.type, event.title);
  }
}
