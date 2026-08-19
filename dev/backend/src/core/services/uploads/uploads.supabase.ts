import { v4 as uuidv4 } from 'uuid';
import { AppError, Errors } from '../../contract/errors';
import { RequestContext } from '../../contract/requestContext';
import { env } from '../../../config/env';
import {
  createPendingAttachment,
  findAttachmentById,
  findPendingAttachmentById,
  findReadyAttachmentById,
  markAttachmentReady,
} from '../../db/repos/attachmentsRepo';
import { getSupabaseClient } from './supabaseClient';
import {
  CompleteInput,
  CompleteOutput,
  PresignInput,
  PresignOutput,
  SignedDownloadUrlOutput,
  UploadService,
} from './uploads.types';

const ALLOWED_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'application/pdf',
];

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const SHA256_REGEX = /^[a-fA-F0-9]{64}$/;

/** Remove caracteres especiais do nome do arquivo, preservando extensão */
function safeFilename(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  const rawName = lastDot > -1 ? filename.slice(0, lastDot) : filename;
  const rawExt = lastDot > -1 ? filename.slice(lastDot) : '';

  const normalizedName = rawName
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  const normalizedExt = rawExt.replace(/[^a-zA-Z0-9._-]/g, '');

  return `${normalizedName || 'file'}${normalizedExt}`;
}

function assertPathBelongsToInstance(instanceId: string, path: string): void {
  if (!path.startsWith(`${instanceId}/`)) {
    throw Errors.forbidden();
  }
}

function validatePresignInput(input: PresignInput): void {
  if (!ALLOWED_CONTENT_TYPES.includes(input.contentType)) {
    throw Errors.validationError({
      contentType: `Allowed: ${ALLOWED_CONTENT_TYPES.join(', ')}`,
      received: input.contentType,
    });
  }

  if (input.size > MAX_SIZE_BYTES) {
    throw Errors.validationError({
      size: `Max allowed: ${MAX_SIZE_BYTES}`,
      received: input.size,
    });
  }
}

async function objectExistsInStorage(bucket: string, storagePath: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  const slashIndex = storagePath.lastIndexOf('/');
  const dirPath = slashIndex > -1 ? storagePath.slice(0, slashIndex) : '';
  const fileName = slashIndex > -1 ? storagePath.slice(slashIndex + 1) : storagePath;

  const { data, error } = await supabase.storage
    .from(bucket)
    .list(dirPath, { search: fileName, limit: 10 });

  if (error) {
    throw new AppError(
      500,
      'UPLOAD_COMPLETE_FAILED',
      'Falha ao verificar upload no storage',
      { supabaseError: error.message },
    );
  }

  return Boolean(data?.some((item) => item.name === fileName));
}

export class SupabaseUploadService implements UploadService {
  private readonly bucket: string;

  constructor() {
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error(
        'SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios quando UPLOAD_MODE=supabase',
      );
    }
    this.bucket = env.SUPABASE_STORAGE_BUCKET;
  }

  async presign(ctx: RequestContext, input: PresignInput): Promise<PresignOutput> {
    validatePresignInput(input);

    const attachmentId = uuidv4();
    const safe = safeFilename(input.filename);
    const storagePath = `${ctx.instanceId}/${attachmentId}_${safe}`;
    assertPathBelongsToInstance(ctx.instanceId, storagePath);

    const supabase = getSupabaseClient();

    const { data, error } = await supabase.storage
      .from(this.bucket)
      .createSignedUploadUrl(storagePath, { upsert: false });

    if (error || !data) {
      throw new AppError(
        500,
        'UPLOAD_PRESIGN_FAILED',
        'Falha ao gerar URL de upload assinada',
        { supabaseError: error?.message },
      );
    }

    await createPendingAttachment({
      id: attachmentId,
      instanceId: ctx.instanceId,
      ownerUserId: ctx.actor?.userId ?? null,
      unitId: ctx.actor?.unitId ?? null,
      bucket: this.bucket,
      path: storagePath,
      contentType: input.contentType,
      sizeBytes: input.size,
    });

    return {
      attachmentId,
      bucket: this.bucket,
      path: storagePath,
      uploadUrl: data.signedUrl,   // campo legado — sempre preenchido
      signedUrl: data.signedUrl,
      token: data.token,
    };
  }

  async complete(ctx: RequestContext, input: CompleteInput): Promise<CompleteOutput> {
    const pendingAttachment = await findPendingAttachmentById(ctx.instanceId, input.attachmentId);
    if (!pendingAttachment) {
      const existingAttachment = await findAttachmentById(ctx.instanceId, input.attachmentId);
      if (!existingAttachment) {
        throw new AppError(404, 'UPLOAD_NOT_FOUND', 'Attachment not found', {});
      }

      if (existingAttachment.status === 'READY') {
        throw new AppError(
          409,
          'ATTACHMENT_ALREADY_COMPLETED',
          'Attachment already completed',
          {},
        );
      }

      throw new AppError(409, 'UPLOAD_INVALID_STATE', 'Attachment is not pending', {
        status: existingAttachment.status,
      });
    }

    assertPathBelongsToInstance(ctx.instanceId, pendingAttachment.path);

    if (input.bucket && input.bucket !== pendingAttachment.bucket) {
      throw Errors.forbidden();
    }

    if (input.path && input.path !== pendingAttachment.path) {
      throw Errors.forbidden();
    }

    if (input.contentType && input.contentType !== pendingAttachment.contentType) {
      throw Errors.validationError({
        contentType: 'contentType differs from presign metadata',
      });
    }

    if (input.sizeBytes !== undefined && input.sizeBytes !== pendingAttachment.sizeBytes) {
      throw Errors.validationError({
        sizeBytes: 'sizeBytes differs from presign metadata',
      });
    }

    if (input.checksumSha256 && !SHA256_REGEX.test(input.checksumSha256)) {
      throw Errors.validationError({
        checksumSha256: 'Must be a SHA-256 hex string (64 chars)',
      });
    }

    const exists = await objectExistsInStorage(pendingAttachment.bucket, pendingAttachment.path);
    if (!exists) {
      throw new AppError(
        404,
        'UPLOAD_NOT_FOUND',
        'Arquivo não encontrado no storage. O upload foi concluído?',
        { attachmentId: pendingAttachment.id },
      );
    }

    const readyAttachment = await markAttachmentReady({
      id: pendingAttachment.id,
      instanceId: pendingAttachment.instanceId,
      contentType: pendingAttachment.contentType,
      sizeBytes: pendingAttachment.sizeBytes,
      checksumSha256: input.checksumSha256,
    });

    if (!readyAttachment) {
      throw new AppError(409, 'UPLOAD_INVALID_STATE', 'Attachment is not pending', {});
    }

    return {
      ok: true,
      attachmentId: readyAttachment.id,
      bucket: readyAttachment.bucket,
      path: readyAttachment.path,
    };
  }

  async getSignedDownloadUrl(
    ctx: RequestContext,
    attachmentId: string,
  ): Promise<SignedDownloadUrlOutput> {
    const attachment = await findReadyAttachmentById(ctx.instanceId, attachmentId);
    if (!attachment) {
      throw new AppError(404, 'UPLOAD_NOT_FOUND', 'Attachment not found', {});
    }

    assertPathBelongsToInstance(ctx.instanceId, attachment.path);

    const ttlSeconds = Math.max(1, env.SUPABASE_STORAGE_SIGNED_DOWNLOAD_TTL_SEC);
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.storage
      .from(attachment.bucket)
      .createSignedUrl(attachment.path, ttlSeconds);

    if (error || !data?.signedUrl) {
      throw new AppError(
        500,
        'UPLOAD_SIGNED_URL_FAILED',
        'Falha ao gerar URL assinada de download',
        { supabaseError: error?.message },
      );
    }

    return {
      url: data.signedUrl,
      expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
    };
  }
}
