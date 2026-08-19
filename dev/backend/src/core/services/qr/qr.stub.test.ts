import assert from 'node:assert/strict';
import test from 'node:test';
import { RequestContext } from '../../contract/requestContext';
import { AppError } from '../../contract/errors';
import { ROLES } from '../../contract/roles';
import { StubQrService } from './qr.stub';
import { QrVerifyOutput } from './qr.types';

function assertDeliveryUnitMatchesQr(deliveryUnitId: string, qrResult: QrVerifyOutput): void {
  if (!qrResult.ok || qrResult.unitId !== deliveryUnitId) {
    throw new AppError(400, 'QR_MISMATCH', 'QR unit does not match');
  }
}

const service = new StubQrService();

test('morador autenticado com unitId gera token QR da propria unidade', async () => {
  const ctx: RequestContext = {
    instanceId: 'instance-1',
    actor: {
      userId: 'resident-1',
      roles: [ROLES.MORADOR],
      unitId: 'unit-123',
    },
  };

  const signature = await service.generateSignature(ctx);
  assert.equal(signature.token, 'dev:unit-123');
});

test('ator sem unitId continua no fallback NO_UNIT', async () => {
  const ctx: RequestContext = {
    instanceId: 'instance-1',
    actor: {
      userId: 'staff-1',
      roles: [ROLES.FUNC_ENTREGAS],
    },
  };

  const signature = await service.generateSignature(ctx);
  assert.equal(signature.token, 'dev:NO_UNIT');
});

test('complete delivery aceita QR da mesma unidade', async () => {
  const signature = await service.generateSignature({
    instanceId: 'instance-1',
    actor: {
      userId: 'resident-1',
      roles: [ROLES.MORADOR],
      unitId: 'unit-123',
    },
  });
  const verified = await service.verify({ instanceId: 'instance-1' }, { token: signature.token });

  assert.doesNotThrow(() => assertDeliveryUnitMatchesQr('unit-123', verified));
});

test('complete delivery falha com QR de outra unidade', async () => {
  const signature = await service.generateSignature({
    instanceId: 'instance-1',
    actor: {
      userId: 'resident-1',
      roles: [ROLES.MORADOR],
      unitId: 'unit-123',
    },
  });
  const verified = await service.verify({ instanceId: 'instance-1' }, { token: signature.token });

  assert.throws(() => assertDeliveryUnitMatchesQr('unit-999', verified), (error: unknown) => {
    return (
      error instanceof AppError &&
      error.statusCode === 400 &&
      error.code === 'QR_MISMATCH'
    );
  });
});
