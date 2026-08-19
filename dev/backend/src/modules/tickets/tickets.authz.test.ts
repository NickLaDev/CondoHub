import assert from 'node:assert/strict';
import test from 'node:test';
import { AppError } from '../../core/contract/errors';
import { ROLES } from '../../core/contract/roles';
import { assertCanChangeTicketStatus } from './tickets.authz';

function expectPermissionDenied(fn: () => void): void {
  assert.throws(fn, (error: unknown) => {
    return (
      error instanceof AppError &&
      error.statusCode === 403 &&
      error.code === 'PERMISSION_DENIED'
    );
  });
}

test('permite manutencao quando ticket esta atribuido ao proprio usuario', () => {
  assert.doesNotThrow(() =>
    assertCanChangeTicketStatus(
      { userId: 'maint-1', roles: [ROLES.FUNC_MANUTENCAO] },
      'maint-1',
    ),
  );
});

test('nega manutencao quando ticket esta atribuido a outro usuario', () => {
  expectPermissionDenied(() =>
    assertCanChangeTicketStatus(
      { userId: 'maint-1', roles: [ROLES.FUNC_MANUTENCAO] },
      'maint-2',
    ),
  );
});

test('nega usuario sem papel compativel', () => {
  expectPermissionDenied(() =>
    assertCanChangeTicketStatus({ userId: 'resident-1', roles: [ROLES.MORADOR] }, 'resident-1'),
  );
});

test('permite sindico alterar qualquer ticket', () => {
  assert.doesNotThrow(() =>
    assertCanChangeTicketStatus(
      { userId: 'sindico-1', roles: [ROLES.SINDICO_ADMIN] },
      'maint-1',
    ),
  );
});
