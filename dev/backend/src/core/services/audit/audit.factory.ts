import { env } from '../../../config/env';
import { AuditService } from './audit.types';
import { ConsoleAuditService } from './audit.console';
import { DbAuditService } from './audit.db.stub';

let instance: AuditService | null = null;

export function getAuditService(): AuditService {
  if (!instance) {
    instance = env.AUDIT_MODE === 'db' ? new DbAuditService() : new ConsoleAuditService();
  }
  return instance;
}
