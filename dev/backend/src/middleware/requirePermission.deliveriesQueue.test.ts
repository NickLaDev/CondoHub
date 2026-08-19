import assert from 'node:assert/strict';
import test from 'node:test';
import { AppError } from '../core/contract/errors';
import { PERMISSIONS } from '../core/contract/permissions';
import { ROLES } from '../core/contract/roles';
import { requirePermission } from './requirePermission';

function runDeliveriesDeliverGuard(roles: string[]): unknown {
  const middleware = requirePermission(PERMISSIONS.DELIVERIES_DELIVER);
  let nextArg: unknown = undefined;

  middleware(
    {
      ctx: {
        actor: {
          userId: 'user-1',
          roles,
        },
      },
    } as never,
    {} as never,
    (error?: unknown) => {
      nextArg = error;
    },
  );

  return nextArg;
}

test('usuario com deliveries:deliver passa no guard (queue retorna 200 no fluxo normal)', () => {
  const nextArg = runDeliveriesDeliverGuard([ROLES.FUNC_ENTREGAS]);
  assert.equal(nextArg, undefined);
});

test('sindico sem deliveries:deliver recebe PERMISSION_DENIED (queue retorna 403)', () => {
  const nextArg = runDeliveriesDeliverGuard([ROLES.SINDICO_ADMIN]);
  assert.ok(nextArg instanceof AppError);
  assert.equal(nextArg.statusCode, 403);
  assert.equal(nextArg.code, 'PERMISSION_DENIED');
});
