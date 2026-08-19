import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../../contract/errors';
import { RequestContext } from '../../contract/requestContext';
import {
  createPendingAttachment,
  findAttachmentById,
  findPendingAttachmentById,
  markAttachmentReady,
} from '../../db/repos/attachmentsRepo';
import {
  CompleteInput,
  CompleteOutput,
  PresignInput,
  PresignOutput,
  SignedDownloadUrlOutput,
  UploadService,
} from './uploads.types';

const UPLOADS_DIR = path.resolve(process.cwd(), 'var/uploads');

export class LocalUploadService implements UploadService {
  constructor() {
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
  }

  async presign(ctx: RequestContext, input: PresignInput): Promise<PresignOutput> {
    const attachmentId = uuidv4();
    const ext = path.extname(input.filename) || '';
    const storedName = `${attachmentId}${ext}`;

    // Create empty placeholder file
    fs.writeFileSync(path.join(UPLOADS_DIR, storedName), '');

    await createPendingAttachment({
      id: attachmentId,
      instanceId: ctx.instanceId,
      ownerUserId: ctx.actor?.userId ?? null,
      unitId: ctx.actor?.unitId ?? null,
      bucket: 'local',
      path: storedName,
      contentType: input.contentType,
      sizeBytes: input.size,
    });

    return {
      uploadUrl: `/var/uploads/${storedName}`,
      attachmentId,
      publicUrl: `/uploads/${storedName}`,
    };
  }

  async complete(ctx: RequestContext, input: CompleteInput): Promise<CompleteOutput> {
    const pendingAttachment = await findPendingAttachmentById(ctx.instanceId, input.attachmentId);

    if (!pendingAttachment) {
      const existingAttachment = await findAttachmentById(ctx.instanceId, input.attachmentId);
      if (!existingAttachment) {
        throw new AppError(404, 'UPLOAD_NOT_FOUND', 'Attachment not found', {});
      }

      if (existingAttachment.status !== 'READY') {
        throw new AppError(409, 'UPLOAD_INVALID_STATE', 'Attachment is not pending', {
          status: existingAttachment.status,
        });
      }

      return {
        ok: true,
        attachmentId: existingAttachment.id,
        publicUrl: `/uploads/${existingAttachment.path}`,
      };
    }

    const readyAttachment = await markAttachmentReady({
      id: pendingAttachment.id,
      instanceId: pendingAttachment.instanceId,
      contentType: input.contentType ?? pendingAttachment.contentType,
      sizeBytes: input.sizeBytes ?? pendingAttachment.sizeBytes,
      checksumSha256: input.checksumSha256,
    });

    if (!readyAttachment) {
      throw new AppError(409, 'UPLOAD_INVALID_STATE', 'Attachment is not pending', {});
    }

    return {
      ok: true,
      attachmentId: readyAttachment.id,
      publicUrl: `/uploads/${readyAttachment.path}`,
    };
  }

  async getSignedDownloadUrl(_ctx: RequestContext, attachmentId: string): Promise<SignedDownloadUrlOutput> {
    return {
      url: `/uploads/${attachmentId}`,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    };
  }
}
