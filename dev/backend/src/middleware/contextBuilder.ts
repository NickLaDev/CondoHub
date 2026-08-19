import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { RequestContext } from '../core/contract/requestContext';
import { Errors } from '../core/contract/errors';
import { getInstanceByKey } from '../modules/instances/instances.repo';
import { InstanceStatus, INSTANCE_STATUS } from '../modules/instances/instances.types';

type TenantContextMeta = {
  instanceId: string;
  instanceKey?: string;
  instanceStatus?: InstanceStatus;
};

function parseInstanceKeyFromOriginalUrl(originalUrl: string): string | null {
  const urlWithoutQuery = originalUrl.split('?')[0];
  const segments = urlWithoutQuery.split('/').filter(Boolean);
  const v1Index = segments.indexOf('v1');
  if (v1Index < 0 || v1Index + 1 >= segments.length) {
    return null;
  }

  return segments[v1Index + 1] || null;
}

function extractInstanceKey(req: Request): string | null {
  const fromParams = req.params.instanceKey as string | undefined;
  if (fromParams && fromParams.trim()) {
    return fromParams.trim();
  }

  const fromMountedPath = req.path.split('/').filter(Boolean)[0];
  if (fromMountedPath) {
    return fromMountedPath;
  }

  return parseInstanceKeyFromOriginalUrl(req.originalUrl);
}

async function resolveTenant(req: Request): Promise<TenantContextMeta> {
  if (env.TENANT_MODE === 'mock') {
    return {
      instanceId: (req.headers['x-dev-instanceid'] as string) || '',
    };
  }

  const instanceKey = extractInstanceKey(req);
  if (!instanceKey) {
    throw Errors.tenantRequired();
  }

  const instance = await getInstanceByKey(instanceKey);
  if (!instance) {
    console.warn(`[TENANT] not found instanceKey=${instanceKey}`);
    throw Errors.tenantNotFound();
  }

  if (instance.status === INSTANCE_STATUS.SUSPENDED) {
    console.warn(`[TENANT] suspended instanceKey=${instanceKey}`);
    throw Errors.instanceSuspended();
  }

  console.log(`[TENANT] resolved instanceKey=${instance.instanceKey} instanceId=${instance.id}`);

  return {
    instanceId: instance.id,
    instanceKey: instance.instanceKey,
    instanceStatus: instance.status,
  };
}

function resolveActor(req: Request): RequestContext['actor'] | undefined {
  if (env.AUTH_MODE === 'mock') {
    const userId = req.headers['x-dev-userid'] as string;
    const rolesHeader = req.headers['x-dev-roles'] as string;
    if (!userId || !rolesHeader) return undefined;
    const roles = rolesHeader.split(',').map((r) => r.trim());
    const unitId = (req.headers['x-dev-unitid'] as string) || undefined;
    return { userId, roles, unitId };
  }

  // JWT mode: public routes must not fail early on invalid/missing Authorization.
  // Token validation and actor extraction are enforced by requireAuth().
  return undefined;
}

export async function contextBuilder(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const tenant = await resolveTenant(req);

    const ctx: RequestContext = {
      instanceId: tenant.instanceId,
      actor: resolveActor(req),
      requestMeta: {
        ip: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        requestId: req.id,
      },
    };

    const ctxWithTenantMeta = ctx as RequestContext & {
      instanceKey?: string;
      instanceStatus?: InstanceStatus;
    };

    if (tenant.instanceKey) {
      ctxWithTenantMeta.instanceKey = tenant.instanceKey;
    }
    if (tenant.instanceStatus) {
      ctxWithTenantMeta.instanceStatus = tenant.instanceStatus;
    }

    req.ctx = ctxWithTenantMeta;
    next();
  } catch (err) {
    next(err);
  }
}
