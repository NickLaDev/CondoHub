import { RequestContext } from '../../contract/requestContext';
import { AuditEntry, AuditService } from './audit.types';
import { sanitizeAuditMetadata } from './audit.sanitize';

export class ConsoleAuditService implements AuditService {
  async log(ctx: RequestContext, entry: AuditEntry): Promise<void> {
    console.log(
      '[AUDIT]',
      JSON.stringify({
        timestamp: new Date().toISOString(),
        instanceId: ctx.instanceId,
        actorId: ctx.actor?.userId,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId ?? null,
        metadata: sanitizeAuditMetadata(entry.metadata),
      }),
    );
  }
}
