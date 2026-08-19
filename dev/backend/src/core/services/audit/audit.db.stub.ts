import { RequestContext } from '../../contract/requestContext';
import { Errors } from '../../contract/errors';
import { getUserById } from '../../db/repos/usersRepo';
import { createAuditLog } from '../../../modules/audit/audit.repo';
import { AuditEntry, AuditService } from './audit.types';
import { sanitizeAuditMetadata } from './audit.sanitize';

type ResolvedActor = {
  actorUserId: string | null;
  metadata: Record<string, unknown>;
};

async function resolveActor(ctx: RequestContext, metadata: Record<string, unknown>): Promise<ResolvedActor> {
  const actorUserId = ctx.actor?.userId;
  if (!actorUserId) {
    return {
      actorUserId: null,
      metadata,
    };
  }

  const actor = await getUserById(actorUserId);
  if (actor?.instanceId === ctx.instanceId) {
    return {
      actorUserId,
      metadata,
    };
  }

  const metadataWithAdminActor =
    metadata.adminActorUserId === undefined
      ? {
          ...metadata,
          adminActorUserId: actorUserId,
        }
      : metadata;

  return {
    actorUserId: null,
    metadata: metadataWithAdminActor,
  };
}

export class DbAuditService implements AuditService {
  async log(ctx: RequestContext, entry: AuditEntry): Promise<void> {
    if (!ctx.instanceId) {
      throw Errors.internalError('Missing instanceId in audit context');
    }

    const metadata = sanitizeAuditMetadata(entry.metadata);
    const resolvedActor = await resolveActor(ctx, metadata);

    await createAuditLog({
      instanceId: ctx.instanceId,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      unitId: ctx.actor?.unitId ?? null,
      actorUserId: resolvedActor.actorUserId,
      ip: ctx.requestMeta?.ip ?? null,
      userAgent: ctx.requestMeta?.userAgent ?? null,
      requestId: ctx.requestMeta?.requestId ?? null,
      metadata: resolvedActor.metadata,
    });
  }
}
