import { AppError, Errors } from '../../contract/errors';
import { formatDbError, getDbPool } from '../../../db/pool';

export type AttachmentLinkRecord = {
  id: string;
  instanceId: string;
  attachmentId: string;
  targetType: string;
  targetId: string;
  tag: string | null;
  createdAt: string;
};

type AttachmentLinkRow = {
  id: string;
  instance_id: string;
  attachment_id: string;
  target_type: string;
  target_id: string;
  tag: string | null;
  created_at: Date | string;
};

export type CreateAttachmentLinkInput = {
  instanceId: string;
  attachmentId: string;
  targetType: string;
  targetId: string;
  tag?: string;
};

function toIso(value: Date | string): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  return String(value);
}

function mapAttachmentLink(row: AttachmentLinkRow): AttachmentLinkRecord {
  return {
    id: row.id,
    instanceId: row.instance_id,
    attachmentId: row.attachment_id,
    targetType: row.target_type,
    targetId: row.target_id,
    tag: row.tag,
    createdAt: toIso(row.created_at),
  };
}

export async function createAttachmentLink(
  input: CreateAttachmentLinkInput,
): Promise<AttachmentLinkRecord> {
  try {
    const result = await getDbPool().query<AttachmentLinkRow>(
      `
      insert into public.attachment_links (
        instance_id,
        attachment_id,
        target_type,
        target_id,
        tag,
        created_at
      )
      values ($1, $2, $3, $4, $5, now())
      returning
        id,
        instance_id,
        attachment_id,
        target_type,
        target_id,
        tag,
        created_at
      `,
      [input.instanceId, input.attachmentId, input.targetType, input.targetId, input.tag ?? null],
    );

    return mapAttachmentLink(result.rows[0]);
  } catch (error) {
    console.error('[ATTACHMENT_LINKS_REPO] createAttachmentLink failed', formatDbError(error));
    if (error instanceof AppError) {
      throw error;
    }
    throw Errors.dbError('Failed to create attachment link');
  }
}
