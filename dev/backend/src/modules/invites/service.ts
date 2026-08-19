import { INVITE_SIGNUP_TTL_SECONDS, signInviteSignupToken } from '../../core/auth/tokens';
import { AppError, Errors } from '../../core/contract/errors';
import { ROLES } from '../../core/contract/roles';
import { RequestContext } from '../../core/contract/requestContext';
import { getAuditService } from '../../core/services/audit/audit.factory';
import { CreateInviteInput, ResolveInviteCodeInput, TenantInvitesListQuery } from './dto';
import { generateInviteCodePayload, hashInviteCode, INVITE_CODE_TTL_SECONDS, normalizeInviteCode } from './inviteCode.util';
import {
  cancelActiveInviteCode,
  createInvite,
  createInviteCode,
  generateInviteToken,
  getActiveInviteCode,
  getInviteById,
  listInvites,
  resolveInviteCodeForSignup,
  revokeInvite,
} from './repo';

type CreateInviteResult = {
  id: string;
  instanceId: string;
  unitId: string;
  kind: string;
  token: string;
  expiresAt: string;
  usedAt: string | null;
  revokedAt: string | null;
  createdByUserId: string | null;
  createdAt: string;
};

type CreateInviteCodeResult = {
  inviteId: string;
  code: string;
  qrValue: string;
  expiresAt: string;
  expiresInSec: number;
};

type ActiveInviteCodeResult = {
  inviteId: string;
  codeLast4: string;
  expiresAt: string;
};

type CancelActiveInviteCodeResult = {
  inviteId: string;
  revokedAt: string;
};

type ResolveInviteCodeResult = {
  ok: true;
  inviteId: string;
  unitId: string;
  signupToken: string;
  expiresAt: string;
};

type ResidentActor = {
  userId: string;
  unitId: string;
};

const RESOLVE_FAILURE_AUDIT_CODES = new Set([
  'INVALID_CODE',
  'INVITE_EXPIRED',
  'INVITE_ALREADY_USED',
  'INVITE_REVOKED',
]);

async function logInviteAuditSafely(
  ctx: RequestContext,
  params: {
    action: string;
    targetType: string;
    targetId?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    await getAuditService().log(ctx, params);
  } catch (auditError) {
    console.error(`[INVITES_SERVICE] failed to write ${params.action} audit log`, auditError);
  }
}

function resolveInviteExpiry(input: CreateInviteInput): Date {
  if (input.expiresAt) {
    const parsed = new Date(input.expiresAt);
    if (Number.isNaN(parsed.getTime())) {
      throw Errors.validationError({ expiresAt: 'Must be a valid datetime' });
    }

    if (parsed <= new Date()) {
      throw new AppError(400, 'INVITE_EXPIRES_AT_INVALID', 'Invite expiration must be in the future');
    }

    return parsed;
  }

  const expiresInHours = input.expiresInHours ?? 72;
  const expiration = new Date();
  expiration.setHours(expiration.getHours() + expiresInHours);
  return expiration;
}

function ensureResidentActorWithUnit(ctx: RequestContext): ResidentActor {
  const actor = ctx.actor;
  if (!actor?.userId) {
    throw Errors.authRequired();
  }

  const hasResidentRole = actor.roles.includes(ROLES.MORADOR);
  if (!hasResidentRole || !actor.unitId) {
    throw new AppError(
      403,
      'INVITE_CODE_NOT_ALLOWED',
      'Only resident users linked to a unit can manage invite codes',
    );
  }

  return {
    userId: actor.userId,
    unitId: actor.unitId,
  };
}

function resolveSignupTokenTtlSeconds(inviteExpiresAtIso: string): number | null {
  const inviteExpiresAt = new Date(inviteExpiresAtIso);
  const inviteRemainingMs = inviteExpiresAt.getTime() - Date.now();
  const inviteRemainingSeconds = Math.floor(inviteRemainingMs / 1000);

  if (!Number.isFinite(inviteRemainingSeconds) || inviteRemainingSeconds <= 0) {
    return null;
  }

  return Math.min(INVITE_SIGNUP_TTL_SECONDS, inviteRemainingSeconds);
}

export async function createInviteService(
  ctx: RequestContext,
  input: CreateInviteInput,
): Promise<CreateInviteResult> {
  const actorUserId = ctx.actor?.userId;
  if (!actorUserId) {
    throw Errors.authRequired();
  }

  const { token, tokenHash } = generateInviteToken();
  const expiresAt = resolveInviteExpiry(input);
  const created = await createInvite({
    instanceId: ctx.instanceId,
    actorUserId,
    input,
    tokenHash,
    expiresAt,
  });

  await getAuditService().log(ctx, {
    action: 'INVITE_CREATED',
    targetType: 'invite',
    targetId: created.id,
    metadata: {
      unitId: created.unitId,
      kind: created.kind,
      expiresAt: created.expiresAt,
    },
  });

  return {
    ...created,
    token,
  };
}

export async function createInviteCodeService(
  ctx: RequestContext,
  instanceKey: string,
): Promise<CreateInviteCodeResult> {
  const actor = ensureResidentActorWithUnit(ctx);
  const payload = generateInviteCodePayload(instanceKey);
  const expiresAt = new Date(Date.now() + INVITE_CODE_TTL_SECONDS * 1000);

  const created = await createInviteCode({
    instanceId: ctx.instanceId,
    actorUserId: actor.userId,
    unitId: actor.unitId,
    codeHash: payload.codeHash,
    codeLast4: payload.codeLast4,
    expiresAt,
  });

  await logInviteAuditSafely(ctx, {
    action: 'INVITE_CODE_CREATED',
    targetType: 'invite',
    targetId: created.inviteId,
    metadata: {
      inviteId: created.inviteId,
      unitId: actor.unitId,
      actorUserId: actor.userId,
      codeLast4: created.codeLast4,
      expiresAt: created.expiresAt,
    },
  });

  return {
    inviteId: created.inviteId,
    code: payload.code,
    qrValue: payload.qrValue,
    expiresAt: created.expiresAt,
    expiresInSec: INVITE_CODE_TTL_SECONDS,
  };
}

export async function listInvitesService(ctx: RequestContext, query: TenantInvitesListQuery) {
  return listInvites(ctx.instanceId, query);
}

export async function getActiveInviteCodeService(ctx: RequestContext): Promise<ActiveInviteCodeResult> {
  const actor = ensureResidentActorWithUnit(ctx);
  const activeInvite = await getActiveInviteCode(ctx.instanceId, actor.unitId);

  if (!activeInvite) {
    throw new AppError(404, 'NO_ACTIVE_INVITE', 'No active invite code for this unit');
  }

  return activeInvite;
}

export async function cancelActiveInviteCodeService(ctx: RequestContext): Promise<CancelActiveInviteCodeResult> {
  const actor = ensureResidentActorWithUnit(ctx);
  const cancelledInvite = await cancelActiveInviteCode({
    instanceId: ctx.instanceId,
    unitId: actor.unitId,
    cancelledReason: 'CANCELLED_BY_RESIDENT',
  });

  if (!cancelledInvite) {
    throw new AppError(404, 'NO_ACTIVE_INVITE', 'No active invite code for this unit');
  }

  await logInviteAuditSafely(ctx, {
    action: 'INVITE_CODE_CANCELLED',
    targetType: 'invite',
    targetId: cancelledInvite.inviteId,
    metadata: {
      inviteId: cancelledInvite.inviteId,
      unitId: actor.unitId,
      actorUserId: actor.userId,
      revokedAt: cancelledInvite.revokedAt,
      cancelledReason: 'CANCELLED_BY_RESIDENT',
    },
  });

  return cancelledInvite;
}

export async function resolveInviteCodeService(
  ctx: RequestContext,
  input: ResolveInviteCodeInput,
): Promise<ResolveInviteCodeResult> {
  const normalizedCode = normalizeInviteCode(input.code);
  if (!normalizedCode) {
    await logInviteAuditSafely(ctx, {
      action: 'INVITE_CODE_RESOLVE_FAILED',
      targetType: 'invite',
      metadata: {
        errorCode: 'INVALID_CODE',
        codeLast4: null,
      },
    });
    throw new AppError(400, 'INVALID_CODE', 'Invite code is invalid');
  }

  const codeHash = hashInviteCode(normalizedCode);

  try {
    const resolvedInvite = await resolveInviteCodeForSignup({
      instanceId: ctx.instanceId,
      codeHash,
    });
    const signupTokenTtlSeconds = resolveSignupTokenTtlSeconds(resolvedInvite.expiresAt);
    if (!signupTokenTtlSeconds) {
      throw new AppError(400, 'INVITE_EXPIRED', 'Invite code has expired');
    }
    const signupToken = signInviteSignupToken(
      {
        instanceId: resolvedInvite.instanceId,
        inviteId: resolvedInvite.inviteId,
        unitId: resolvedInvite.unitId,
        purpose: 'invite_signup',
      },
      signupTokenTtlSeconds,
    );
    const tokenExpiresAt = new Date(Date.now() + signupTokenTtlSeconds * 1000).toISOString();

    await logInviteAuditSafely(ctx, {
      action: 'INVITE_CODE_RESOLVED',
      targetType: 'invite',
      targetId: resolvedInvite.inviteId,
      metadata: {
        inviteId: resolvedInvite.inviteId,
        unitId: resolvedInvite.unitId,
        codeLast4: normalizedCode.slice(-4),
        expiresAt: tokenExpiresAt,
      },
    });

    return {
      ok: true,
      inviteId: resolvedInvite.inviteId,
      unitId: resolvedInvite.unitId,
      signupToken,
      expiresAt: tokenExpiresAt,
    };
  } catch (error) {
    if (error instanceof AppError && RESOLVE_FAILURE_AUDIT_CODES.has(error.code)) {
      await logInviteAuditSafely(ctx, {
        action: 'INVITE_CODE_RESOLVE_FAILED',
        targetType: 'invite',
        metadata: {
          errorCode: error.code,
          codeLast4: normalizedCode.slice(-4),
        },
      });
    }

    throw error;
  }
}

export async function revokeInviteService(ctx: RequestContext, inviteId: string) {
  const existing = await getInviteById(ctx.instanceId, inviteId);
  if (!existing) {
    throw new AppError(404, 'INVITE_NOT_FOUND', 'Invite not found');
  }

  if (existing.usedAt) {
    throw new AppError(409, 'INVITE_ALREADY_USED', 'Used invite cannot be revoked');
  }

  if (existing.revokedAt) {
    throw new AppError(409, 'INVITE_ALREADY_REVOKED', 'Invite already revoked');
  }

  const revoked = await revokeInvite(ctx.instanceId, inviteId);
  if (!revoked) {
    throw new AppError(404, 'INVITE_NOT_FOUND', 'Invite not found');
  }

  await getAuditService().log(ctx, {
    action: 'INVITE_REVOKED',
    targetType: 'invite',
    targetId: revoked.id,
    metadata: {
      unitId: revoked.unitId,
      revokedAt: revoked.revokedAt,
    },
  });

  return revoked;
}
