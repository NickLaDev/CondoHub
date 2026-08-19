import { RequestContext } from '../../contract/requestContext';

export interface QrSignatureOutput {
  token: string;
  expiresAt: string;
}

export interface QrVerifyInput {
  token: string;
}

export interface QrVerifyOutput {
  ok: boolean;
  unitId?: string;
  subjectUserId?: string;
  reason?: string;
}

export interface QrService {
  generateSignature(ctx: RequestContext): Promise<QrSignatureOutput>;
  verify(ctx: RequestContext, input: QrVerifyInput): Promise<QrVerifyOutput>;
}
