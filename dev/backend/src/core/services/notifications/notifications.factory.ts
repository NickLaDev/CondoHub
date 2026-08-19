import { NotificationService } from './notifications.types';
import { DbNotificationService } from './notifications.db';

let instance: NotificationService | null = null;

export function getNotificationService(): NotificationService {
  if (!instance) {
    instance = new DbNotificationService();
  }
  return instance;
}
