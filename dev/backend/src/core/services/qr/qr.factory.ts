import { QrService } from './qr.types';
import { StubQrService } from './qr.stub';

let instance: QrService | null = null;

export function getQrService(): QrService {
  if (!instance) {
    instance = new StubQrService();
  }
  return instance;
}
