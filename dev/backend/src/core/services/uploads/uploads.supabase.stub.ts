import { RequestContext } from '../../contract/requestContext';
import { Errors } from '../../contract/errors';
import {
  CompleteInput,
  CompleteOutput,
  PresignInput,
  PresignOutput,
  SignedDownloadUrlOutput,
  UploadService,
} from './uploads.types';

export class SupabaseUploadService implements UploadService {
  async presign(_ctx: RequestContext, _input: PresignInput): Promise<PresignOutput> {
    throw Errors.notImplemented();
  }

  async complete(_ctx: RequestContext, _input: CompleteInput): Promise<CompleteOutput> {
    throw Errors.notImplemented();
  }

  async getSignedDownloadUrl(_ctx: RequestContext, _attachmentId: string): Promise<SignedDownloadUrlOutput> {
    throw Errors.notImplemented();
  }
}
