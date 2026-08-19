import { NextFunction, Request, Response } from 'express';
import { z, ZodError } from 'zod';
import {
  ACCESS_TTL_SECONDS,
  extractTokenVersionFromRefreshToken,
  generateRefreshToken,
  getRefreshExpiry,
  hashRefreshToken,
  signAccessToken,
  signInstanceSelectionToken,
  verifyInstanceSelectionToken,
  verifyInviteSignupToken,
} from '../../core/auth/tokens';
import { AppError, Errors } from '../../core/contract/errors';
import { ROLES } from '../../core/contract/roles';
import { INSTANCE_STATUS } from '../instances/instances.types';
import { getAuditService } from '../../core/services/audit/audit.factory';
import {
  createSession,
  findByRefreshHash,
  revokeSession,
  rotateSession,
} from '../../core/db/repos/sessionsRepo';
import {
  ActiveTenantAuthUser,
  findActiveTenantUsersByEmail,
  getActiveTenantUserByIdAndInstanceId,
  getAdminUserByEmail,
  getTenantUserByEmail,
  getUserById,
  verifyPassword,
} from '../../core/db/repos/usersRepo';
import {
  AuthSuccessResponse,
  AuthTokens,
  AuthUser,
  InstanceSelectionOption,
  InstanceSelectionRequiredResponse,
} from './auth.types';
import { registerWithInvite } from './registerWithInvite.repo';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const globalLoginSchema = z
  .object({
    email: z.string().trim().email(),
    password: z.string().min(1),
  })
  .strict();

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const logoutSchema = z.object({
  refreshToken: z.string().min(1),
});

const selectInstanceSchema = z
  .object({
    selectionToken: z.string().min(1),
    instanceId: z.string().uuid(),
  })
  .strict();

const registerWithInviteSchema = z
  .object({
    signupToken: z.string().min(1),
    name: z.string().trim().min(1).max(160),
    email: z.string().trim().email(),
    password: z.string().min(6).max(256),
    phone: z.string().trim().min(1).max(40).optional().nullable(),
  })
  .strict();

const REGISTER_WITH_INVITE_FAILURE_AUDIT_CODES = new Set([
  'INVALID_SIGNUP_TOKEN',
  'SIGNUP_TOKEN_EXPIRED',
  'INVALID_INVITE_CONTEXT',
  'INVITE_ALREADY_USED',
  'INVITE_REVOKED',
  'INVITE_EXPIRED',
  'USER_EMAIL_CONFLICT',
  'VALIDATION_ERROR',
]);

function extractEmailForAudit(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') {
    return undefined;
  }

  const email = (body as Record<string, unknown>).email;
  if (typeof email !== 'string') {
    return undefined;
  }

  const normalized = email.trim().toLowerCase();
  return normalized.length > 0 ? normalized : undefined;
}

async function logAuthAuditSafely(
  req: Request,
  params: {
    action: string;
    targetType: string;
    targetId?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    await getAuditService().log(req.ctx, params);
  } catch (auditError) {
    console.error(`[AUTH] failed to write ${params.action} audit log`, auditError);
  }
}

function ensureActiveUser(user: AuthUser | null): AuthUser {
  if (!user || user.status !== 'ACTIVE') {
    throw Errors.authInvalid();
  }

  return user;
}

function invalidCredentialsError(): AppError {
  return new AppError(401, 'AUTH_INVALID', 'Invalid credentials');
}

function invalidGlobalCredentialsError(): AppError {
  return new AppError(401, 'INVALID_CREDENTIALS', 'Invalid credentials');
}

function invalidSelectionTokenError(): AppError {
  return new AppError(401, 'INVALID_SELECTION_TOKEN', 'Selection token is invalid');
}

function instanceSelectionNotAllowedError(): AppError {
  return new AppError(403, 'INSTANCE_SELECTION_NOT_ALLOWED', 'Instance selection is not allowed');
}

function ensureActiveLoginUser(user: AuthUser | null): AuthUser {
  if (!user || user.status !== 'ACTIVE') {
    throw invalidCredentialsError();
  }

  return user;
}

function buildAccessToken(user: AuthUser): string {
  return signAccessToken({
    sub: user.id,
    iid: user.instanceId,
    uid: user.unitId,
    roles: user.roles,
    tv: user.tokenVersion,
  });
}

async function issueTokens(user: AuthUser): Promise<AuthTokens> {
  const refreshToken = generateRefreshToken(user.tokenVersion);
  const refreshHash = hashRefreshToken(refreshToken);
  const expiresAt = getRefreshExpiry();

  await createSession({
    instanceId: user.instanceId,
    userId: user.id,
    refreshHash,
    expiresAt,
  });

  const accessToken = buildAccessToken(user);

  return {
    accessToken,
    refreshToken,
  };
}

function buildAuthSuccessResponse(
  user: AuthUser,
  tokens: AuthTokens,
  options: { instanceKey?: string | null } = {},
): AuthSuccessResponse {
  const responseUser: AuthSuccessResponse['user'] = {
    id: user.id,
    instanceId: user.instanceId,
    unitId: user.unitId,
    roles: user.roles,
    name: user.name,
    email: user.email,
    phone: user.phone,
  };

  if (options.instanceKey !== undefined) {
    responseUser.instanceKey = options.instanceKey;
  }

  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresInSec: ACCESS_TTL_SECONDS,
    user: responseUser,
  };
}

async function findUsersWithValidPassword(
  users: ActiveTenantAuthUser[],
  password: string,
): Promise<ActiveTenantAuthUser[]> {
  const validUsers: ActiveTenantAuthUser[] = [];

  for (const user of users) {
    if (await verifyPassword(user.id, password)) {
      validUsers.push(user);
    }
  }

  return validUsers;
}

function getRequestInstanceKey(req: Request): string | undefined {
  return (req.ctx as typeof req.ctx & { instanceKey?: string }).instanceKey;
}

function buildSelectionOption(user: ActiveTenantAuthUser): InstanceSelectionOption {
  return {
    instanceId: user.instanceId,
    instanceKey: user.instanceKey,
    instanceName: user.instanceName,
    userId: user.id,
    unitId: user.unitId,
    unitLabel: user.unitLabel ?? null,
    roles: user.roles,
  };
}

function buildInstanceSelectionResponse(users: ActiveTenantAuthUser[]): InstanceSelectionRequiredResponse {
  const selectionToken = signInstanceSelectionToken({
    purpose: 'instance_selection',
    email: users[0].email ?? '',
    allowed: users.map((user) => ({
      userId: user.id,
      instanceId: user.instanceId,
    })),
  });

  return {
    requiresInstanceSelection: true,
    selectionToken,
    options: users.map(buildSelectionOption),
  };
}

async function loadSelectedUserOrFail(selectionToken: string, instanceId: string): Promise<ActiveTenantAuthUser> {
  const claims = verifyInstanceSelectionToken(selectionToken);
  const allowed = claims.allowed.find((item) => item.instanceId === instanceId);

  if (!allowed) {
    throw instanceSelectionNotAllowedError();
  }

  const user = await getActiveTenantUserByIdAndInstanceId(allowed.userId, allowed.instanceId);
  if (!user) {
    throw invalidSelectionTokenError();
  }

  return user;
}

export async function globalLoginHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = globalLoginSchema.parse(req.body);
    const candidateUsers = await findActiveTenantUsersByEmail(input.email);
    const validUsers = await findUsersWithValidPassword(candidateUsers, input.password);

    if (validUsers.length === 0) {
      throw invalidGlobalCredentialsError();
    }

    if (validUsers.length > 1) {
      res.json(buildInstanceSelectionResponse(validUsers));
      return;
    }

    const [user] = validUsers;
    if (user.instanceStatus !== INSTANCE_STATUS.ACTIVE) {
      throw Errors.instanceSuspended();
    }

    const tokens = await issueTokens(user);
    res.json(buildAuthSuccessResponse(user, tokens, { instanceKey: user.instanceKey }));
  } catch (error) {
    next(error);
  }
}

export async function selectInstanceHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = selectInstanceSchema.parse(req.body);
    const user = await loadSelectedUserOrFail(input.selectionToken, input.instanceId);

    if (user.instanceStatus !== INSTANCE_STATUS.ACTIVE) {
      throw Errors.instanceSuspended();
    }

    const tokens = await issueTokens(user);
    res.json(buildAuthSuccessResponse(user, tokens, { instanceKey: user.instanceKey }));
  } catch (error) {
    next(error);
  }
}

export async function tenantLoginHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = loginSchema.parse(req.body);

    if (!req.ctx.instanceId) {
      throw Errors.tenantRequired();
    }

    const user = ensureActiveLoginUser(await getTenantUserByEmail(req.ctx.instanceId, input.email));

    const passwordValid = await verifyPassword(user.id, input.password);
    if (!passwordValid) {
      throw invalidCredentialsError();
    }

    const tokens = await issueTokens(user);
    res.json(buildAuthSuccessResponse(user, tokens, { instanceKey: getRequestInstanceKey(req) }));
  } catch (error) {
    next(error);
  }
}

export async function adminLoginHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = loginSchema.parse(req.body);

    const user = ensureActiveLoginUser(await getAdminUserByEmail(input.email));
    if (!user.roles.includes(ROLES.ADMIN_GLOBAL)) {
      throw invalidCredentialsError();
    }

    const passwordValid = await verifyPassword(user.id, input.password);
    if (!passwordValid) {
      throw invalidCredentialsError();
    }

    const tokens = await issueTokens(user);
    res.json(
      buildAuthSuccessResponse(
        {
          ...user,
          instanceId: null,
          unitId: null,
        },
        tokens,
      ),
    );
  } catch (error) {
    next(error);
  }
}

export async function tenantMeHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const actor = req.ctx.actor;
    if (!actor) {
      throw Errors.authRequired();
    }

    res.json({
      userId: actor.userId,
      roles: actor.roles,
      unitId: actor.unitId ?? null,
      instanceId: req.ctx.instanceId,
    });
  } catch (error) {
    next(error);
  }
}

export async function adminMeHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const actor = req.ctx.actor;
    if (!actor) {
      throw Errors.authRequired();
    }

    res.json({
      userId: actor.userId,
      roles: actor.roles,
      unitId: actor.unitId ?? null,
      instanceId: null,
    });
  } catch (error) {
    next(error);
  }
}

export async function tenantLogoutHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const actor = req.ctx.actor;
    if (!actor) {
      throw Errors.authRequired();
    }

    const input = logoutSchema.parse(req.body);

    const session = await findByRefreshHash(hashRefreshToken(input.refreshToken));
    if (!session) {
      throw Errors.authInvalid();
    }

    if (session.userId !== actor.userId) {
      throw Errors.forbidden();
    }

    if (session.instanceId !== req.ctx.instanceId) {
      throw Errors.forbidden();
    }

    await revokeSession(session.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function refreshHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = refreshSchema.parse(req.body);

    const refreshHash = hashRefreshToken(input.refreshToken);
    const session = await findByRefreshHash(refreshHash);

    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      throw Errors.authInvalid();
    }

    const user = ensureActiveUser(await getUserById(session.userId));

    const refreshTokenVersion = extractTokenVersionFromRefreshToken(input.refreshToken);
    if (refreshTokenVersion === null || refreshTokenVersion !== user.tokenVersion) {
      throw Errors.authInvalid();
    }

    if (session.instanceId !== user.instanceId) {
      throw Errors.authInvalid();
    }

    const newRefreshToken = generateRefreshToken(user.tokenVersion);
    const newRefreshHash = hashRefreshToken(newRefreshToken);

    await rotateSession({
      oldSessionId: session.id,
      newRefreshHash,
      newExpiresAt: getRefreshExpiry(),
    });

    const accessToken = buildAccessToken(user);
    const tokens: AuthTokens = {
      accessToken,
      refreshToken: newRefreshToken,
    };

    res.json(buildAuthSuccessResponse(user, tokens));
  } catch (error) {
    next(error);
  }
}

export async function registerWithInviteHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  let inviteId: string | undefined;
  let unitId: string | undefined;
  let emailForAudit: string | undefined;

  try {
    const input = registerWithInviteSchema.parse(req.body);
    emailForAudit = input.email.trim().toLowerCase();

    if (!req.ctx.instanceId) {
      throw Errors.tenantRequired();
    }

    const signupClaims = verifyInviteSignupToken(input.signupToken);
    inviteId = signupClaims.inviteId;
    unitId = signupClaims.unitId;

    if (signupClaims.instanceId !== req.ctx.instanceId) {
      throw new AppError(400, 'INVALID_INVITE_CONTEXT', 'Invite context is invalid');
    }

    const result = await registerWithInvite({
      instanceId: req.ctx.instanceId,
      inviteId: signupClaims.inviteId,
      unitId: signupClaims.unitId,
      name: input.name,
      email: input.email,
      password: input.password,
      phone: input.phone,
    });

    await logAuthAuditSafely(req, {
      action: 'INVITE_SIGNUP_COMPLETED',
      targetType: 'invite',
      targetId: inviteId,
      metadata: {
        inviteId,
        unitId,
        actorUserId: req.ctx.actor?.userId ?? null,
        createdUserId: result.user.id,
        email: emailForAudit,
      },
    });

    res.json(result);
  } catch (error) {
    const errorCode =
      error instanceof AppError
        ? error.code
        : error instanceof ZodError
          ? 'VALIDATION_ERROR'
          : null;

    if (errorCode && REGISTER_WITH_INVITE_FAILURE_AUDIT_CODES.has(errorCode)) {
      await logAuthAuditSafely(req, {
        action: 'INVITE_SIGNUP_FAILED',
        targetType: 'invite',
        targetId: inviteId,
        metadata: {
          inviteId,
          unitId,
          actorUserId: req.ctx.actor?.userId ?? null,
          email: emailForAudit ?? extractEmailForAudit(req.body),
          errorCode,
        },
      });
    }

    next(error);
  }
}
