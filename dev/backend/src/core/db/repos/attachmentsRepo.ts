import { AppError, Errors } from '../../contract/errors';
import { formatDbError, getDbPool } from '../../../db/pool';

export type AttachmentStatus = 'PENDING' | 'READY' | 'FAILED' | 'DELETED';

export type AttachmentRecord = {
  id: string;
  instanceId: string;
  ownerUserId: string | null;
  unitId: string | null;
  status: AttachmentStatus;
  bucket: string;
  path: string;
  contentType: string;
  sizeBytes: number;
  checksumSha256: string | null;
  createdAt: string;
  updatedAt: string | null;
  completedAt: string | null;
};

type AttachmentRow = {
  id: string;
  instance_id: string;
  owner_user_id: string | null;
  unit_id: string | null;
  status: AttachmentStatus;
  bucket: string;
  path: string;
  content_type: string;
  size_bytes: number | string;
  checksum_sha256: string | null;
  created_at: Date | string;
  updated_at: Date | string | null;
  completed_at: Date | string | null;
};

export type CreatePendingAttachmentInput = {
  id: string;
  instanceId: string;
  ownerUserId: string | null;
  unitId: string | null;
  bucket: string;
  path: string;
  contentType: string;
  sizeBytes: number;
};

export type MarkAttachmentReadyInput = {
  id: string;
  instanceId: string;
  contentType: string;
  sizeBytes: number;
  checksumSha256?: string;
};

function toIso(value: Date | string | null): string | null {
  if (value === null) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  return String(value);
}

function parseSizeBytes(value: number | string): number {
  if (typeof value === 'number') {
    return value;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function mapAttachment(row: AttachmentRow): AttachmentRecord {
  return {
    id: row.id,
    instanceId: row.instance_id,
    ownerUserId: row.owner_user_id,
    unitId: row.unit_id,
    status: row.status,
    bucket: row.bucket,
    path: row.path,
    contentType: row.content_type,
    sizeBytes: parseSizeBytes(row.size_bytes),
    checksumSha256: row.checksum_sha256,
    createdAt: toIso(row.created_at) ?? new Date().toISOString(),
    updatedAt: toIso(row.updated_at),
    completedAt: toIso(row.completed_at),
  };
}

async function querySingleAttachment(
  query: string,
  params: unknown[],
): Promise<AttachmentRecord | null> {
  const result = await getDbPool().query<AttachmentRow>(query, params);
  if (result.rowCount === 0) {
    return null;
  }
  return mapAttachment(result.rows[0]);
}

export async function createPendingAttachment(
  input: CreatePendingAttachmentInput,
): Promise<AttachmentRecord> {
  try {
    const result = await getDbPool().query<AttachmentRow>(
      `
      insert into public.attachments (
        id,
        instance_id,
        owner_user_id,
        unit_id,
        status,
        bucket,
        path,
        content_type,
        size_bytes,
        checksum_sha256,
        created_at,
        updated_at,
        completed_at
      )
      values ($1, $2, $3, $4, 'PENDING', $5, $6, $7, $8, null, now(), now(), null)
      returning
        id,
        instance_id,
        owner_user_id,
        unit_id,
        status,
        bucket,
        path,
        content_type,
        size_bytes,
        checksum_sha256,
        created_at,
        updated_at,
        completed_at
      `,
      [
        input.id,
        input.instanceId,
        input.ownerUserId,
        input.unitId,
        input.bucket,
        input.path,
        input.contentType,
        input.sizeBytes,
      ],
    );

    return mapAttachment(result.rows[0]);
  } catch (error) {
    console.error('[ATTACHMENTS_REPO] createPendingAttachment failed', formatDbError(error));
    if (error instanceof AppError) {
      throw error;
    }
    throw Errors.dbError('Failed to create pending attachment');
  }
}

export async function findAttachmentById(
  instanceId: string,
  attachmentId: string,
): Promise<AttachmentRecord | null> {
  try {
    return await querySingleAttachment(
      `
      select
        id,
        instance_id,
        owner_user_id,
        unit_id,
        status,
        bucket,
        path,
        content_type,
        size_bytes,
        checksum_sha256,
        created_at,
        updated_at,
        completed_at
      from public.attachments
      where instance_id = $1
        and id = $2
      limit 1
      `,
      [instanceId, attachmentId],
    );
  } catch (error) {
    console.error('[ATTACHMENTS_REPO] findAttachmentById failed', formatDbError(error));
    if (error instanceof AppError) {
      throw error;
    }
    throw Errors.dbError('Failed to load attachment');
  }
}

export async function findPendingAttachmentById(
  instanceId: string,
  attachmentId: string,
): Promise<AttachmentRecord | null> {
  try {
    return await querySingleAttachment(
      `
      select
        id,
        instance_id,
        owner_user_id,
        unit_id,
        status,
        bucket,
        path,
        content_type,
        size_bytes,
        checksum_sha256,
        created_at,
        updated_at,
        completed_at
      from public.attachments
      where instance_id = $1
        and id = $2
        and status = 'PENDING'
      limit 1
      `,
      [instanceId, attachmentId],
    );
  } catch (error) {
    console.error('[ATTACHMENTS_REPO] findPendingAttachmentById failed', formatDbError(error));
    if (error instanceof AppError) {
      throw error;
    }
    throw Errors.dbError('Failed to load pending attachment');
  }
}

export async function findReadyAttachmentById(
  instanceId: string,
  attachmentId: string,
): Promise<AttachmentRecord | null> {
  try {
    return await querySingleAttachment(
      `
      select
        id,
        instance_id,
        owner_user_id,
        unit_id,
        status,
        bucket,
        path,
        content_type,
        size_bytes,
        checksum_sha256,
        created_at,
        updated_at,
        completed_at
      from public.attachments
      where instance_id = $1
        and id = $2
        and status = 'READY'
      limit 1
      `,
      [instanceId, attachmentId],
    );
  } catch (error) {
    console.error('[ATTACHMENTS_REPO] findReadyAttachmentById failed', formatDbError(error));
    if (error instanceof AppError) {
      throw error;
    }
    throw Errors.dbError('Failed to load ready attachment');
  }
}

export async function markAttachmentReady(
  input: MarkAttachmentReadyInput,
): Promise<AttachmentRecord | null> {
  try {
    const result = await getDbPool().query<AttachmentRow>(
      `
      update public.attachments
      set
        status = 'READY',
        content_type = $3,
        size_bytes = $4,
        checksum_sha256 = coalesce($5, checksum_sha256),
        completed_at = coalesce(completed_at, now()),
        updated_at = now()
      where instance_id = $1
        and id = $2
        and status = 'PENDING'
      returning
        id,
        instance_id,
        owner_user_id,
        unit_id,
        status,
        bucket,
        path,
        content_type,
        size_bytes,
        checksum_sha256,
        created_at,
        updated_at,
        completed_at
      `,
      [input.instanceId, input.id, input.contentType, input.sizeBytes, input.checksumSha256 ?? null],
    );

    if (result.rowCount === 0) {
      return null;
    }

    return mapAttachment(result.rows[0]);
  } catch (error) {
    console.error('[ATTACHMENTS_REPO] markAttachmentReady failed', formatDbError(error));
    if (error instanceof AppError) {
      throw error;
    }
    throw Errors.dbError('Failed to mark attachment as ready');
  }
}

export async function assertReadyAttachmentForInstance(
  instanceId: string,
  attachmentId: string,
): Promise<AttachmentRecord> {
  const attachment = await findReadyAttachmentById(instanceId, attachmentId);
  if (!attachment) {
    throw new AppError(404, 'UPLOAD_NOT_FOUND', 'Attachment not found', {});
  }
  return attachment;
}
