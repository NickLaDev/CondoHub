import { RequestContext } from '../../contract/requestContext';
import { NotificationEvent, NotificationService, RegisterInput } from './notifications.types';

export class StubNotificationService implements NotificationService {
  async register(_ctx: RequestContext, input: RegisterInput): Promise<{ ok: true }> {
    console.log('[NOTIFICATION-STUB] register:', input.platform, input.token.slice(0, 8) + '...');
    return { ok: true };
  }

  async enqueue(event: NotificationEvent): Promise<void> {
    console.log('[NOTIFICATION-STUB] enqueue:', event.type, event.title);
  }
}
