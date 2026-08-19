import { RequestContext } from '../../contract/requestContext';
import { QrService, QrSignatureOutput, QrVerifyInput, QrVerifyOutput } from './qr.types';

export class StubQrService implements QrService {
  async generateSignature(ctx: RequestContext): Promise<QrSignatureOutput> {
    const unitId = ctx.actor?.unitId || 'NO_UNIT';
    const token = `dev:${unitId}`;
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    return { token, expiresAt };
  }

  async verify(_ctx: RequestContext, input: QrVerifyInput): Promise<QrVerifyOutput> {
    // Expected format: "dev:<unitId>"
    if (input.token.startsWith('dev:')) {
      const unitId = input.token.slice(4);
      return { ok: true, unitId, reason: 'dev_mode_verified' };
    }
    return { ok: false, reason: 'INVALID_TOKEN' };
  }
}
