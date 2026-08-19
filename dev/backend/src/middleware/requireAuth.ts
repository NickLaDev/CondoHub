import { Request, RequestHandler } from 'express';
import { env } from '../config/env';
import { verifyAccessToken } from '../core/auth/tokens';
import { Errors } from '../core/contract/errors';
import { RequestContext } from '../core/contract/requestContext';
import { getUserById } from '../core/db/repos/usersRepo';

function hasValidActor(actor: RequestContext['actor'] | undefined): actor is NonNullable<RequestContext['actor']> {
  return Boolean(
    actor &&
      typeof actor.userId === 'string' &&
      actor.userId.length > 0 &&
      Array.isArray(actor.roles) &&
      actor.roles.length > 0,
  );
}

function resolveMockActor(req: Request): RequestContext['actor'] | undefined {
  const userId = req.headers['x-dev-userid'] as string | undefined;
  const rolesHeader = req.headers['x-dev-roles'] as string | undefined;

  if (!userId || !rolesHeader) {
    return undefined;
  }

  const roles = rolesHeader
    .split(',')
    .map((role) => role.trim())
    .filter(Boolean);

  if (roles.length === 0) {
    return undefined;
  }

  const unitId = (req.headers['x-dev-unitid'] as string | undefined) || undefined;

  return {
    userId,
    roles,
    unitId,
  };
}

function ensureContext(req: Request): RequestContext {
  const existing = (req as Request & { ctx?: RequestContext }).ctx;
  if (existing) {
    return existing;
  }

  return {
    instanceId: '',
    requestMeta: {
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
      requestId: req.id,
    },
  };
}

function getBearerToken(req: Request): string {
  const authHeader = req.get('authorization');

  if (!authHeader) {
    throw Errors.authRequired();
  }

  const trimmed = authHeader.trim();
  if (!trimmed.startsWith('Bearer ')) {
    throw Errors.authInvalid();
  }

  const token = trimmed.slice('Bearer '.length).trim();
  if (!token) {
    throw Errors.authInvalid();
  }

  return token;
}

export function requireAuth(): RequestHandler {
  return async (req, _res, next) => {
    try {
      const existingCtx = ensureContext(req);

      if (env.AUTH_MODE === 'jwt') {
        const token = getBearerToken(req);
        const claims = verifyAccessToken(token);

        const user = await getUserById(claims.sub);
        if (!user || user.status !== 'ACTIVE') {
          throw Errors.authInvalid();
        }

        if (user.tokenVersion !== claims.tv) {
          throw Errors.authInvalid();
        }

        if (existingCtx.instanceId) {
          if (claims.iid === null || claims.iid !== existingCtx.instanceId) {
            throw Errors.forbidden();
          }
        }

        req.ctx = {
          ...existingCtx,
          actor: {
            userId: claims.sub,
            roles: claims.roles,
            unitId: claims.uid || undefined,
          },
        };

        next();
        return;
      }

      if (env.AUTH_MODE === 'mock') {
        const actor = hasValidActor(existingCtx.actor) ? existingCtx.actor : resolveMockActor(req);

        if (!hasValidActor(actor)) {
          throw Errors.authRequired();
        }

        req.ctx = {
          ...existingCtx,
          actor,
        };

        next();
        return;
      }
      throw Errors.internalError('Invalid auth mode');
    } catch (error) {
      next(error);
    }
  };
}

export function requireAuthIfPresent(): RequestHandler {
  const auth = requireAuth();

  return (req, res, next) => {
    const authHeader = req.get('authorization');

    if (!authHeader) {
      next();
      return;
    }

    auth(req, res, next);
  };
}
