import { RequestHandler } from 'express';
import { Errors } from '../core/contract/errors';
import { Permission } from '../core/contract/permissions';
import { hasPermission } from '../core/contract/rolePermissions';

export function requirePermission(permission: Permission): RequestHandler {
  return (req, _res, next) => {
    try {
      const actor = req.ctx?.actor;
      if (!actor || !actor.userId || !Array.isArray(actor.roles) || actor.roles.length === 0) {
        throw Errors.authRequired();
      }

      if (!hasPermission(actor.roles, permission)) {
        throw Errors.permissionDenied();
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
