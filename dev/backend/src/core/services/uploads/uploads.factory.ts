import { env } from '../../../config/env';
import { UploadService } from './uploads.types';
import { LocalUploadService } from './uploads.local';
import { SupabaseUploadService } from './uploads.supabase';

let instance: UploadService | null = null;

export function getUploadService(): UploadService {
  if (!instance) {
    instance = env.UPLOAD_MODE === 'supabase' ? new SupabaseUploadService() : new LocalUploadService();
  }
  return instance;
}
