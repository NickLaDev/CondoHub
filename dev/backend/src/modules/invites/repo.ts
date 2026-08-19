import crypto from 'node:crypto';
import { PoolClient } from 'pg';
import { PaginatedResponse } from '../../core/contract/pagination';
import { AppError, Errors } from '../../core/contract/errors';
import { formatDbError, getDbPool } from '../../db/pool';
import { withTx } from '../../db/tx';
import { CreateInviteInput, TenantInvitesListQuery } from './dto';

type DbErrorLike = Error & {
  code?: string;
  constraint?: string;
};

type TotalRow = {
  total: string;
};

type InviteRow = {
  id: string;
  instance_id: string;
  unit_id: string;
  kind: string;
  token_hash: string;
  expires_at: Date | string;
  used_at: Date | string | null;
  revoked_at: Date | string | null;
  created_by_user_id: string | null;
  created_at: Date | string;
};

type InviteCodeRow = {
  id: string;
  code_last4: string;
  expires_at: Date | string;
};

type CancelledInviteCodeRow = {
  id: string;
  revoked_at: Date | string;
};

type InviteCodeLookupRow = {
  id: string;
  instance_id: string;
  unit_id: string;
  kind: string;
  expires_at: Date | string;
  used_at: Date | string | null;
  used_by_user_id: string | null;
  revoked_at: Date | string | null;
  cancelled_reason: string | null;
  created_by_user_id: string | null;
};

type UnitRow = {
  id: string;
};

export type InviteItem = {
  id: string;
  instanceId: string;
  unitId: string;
  kind: string;
  expiresAt: string;
  usedAt: string | null;
  revokedAt: string | null;
  createdByUserId: string | null;
  createdAt: string;
};

export type InviteCodeItem = {
  inviteId: string;
  codeLast4: string;
  expiresAt: string;
};

export type CancelledInviteCodeItem = {
  inviteId: string;
  revokedAt: string;
};

export type ResolvedInviteCodeItem = {
  inviteId: string;
  instanceId: string;
  unitId: string;
  expiresAt: string;
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

function mapInvite(row: InviteRow): InviteItem {
  return {
    id: row.id,
    instanceId: row.instance_id,
    unitId: row.unit_id,
    kind: row.kind,
    expiresAt: toIso(row.expires_at),
    usedAt: row.used_at ? toIso(row.used_at) : null,
    revokedAt: row.revoked_at ? toIso(row.revoked_at) : null,
    createdByUserId: row.created_by_user_id,
    createdAt: toIso(row.created_at),
  };
}

function mapInviteCode(row: InviteCodeRow): InviteCodeItem {
  return {
    inviteId: row.id,
    codeLast4: row.code_last4,
    expiresAt: toIso(row.expires_at),
  };
}

function mapCancelledInviteCode(row: CancelledInviteCodeRow): CancelledInviteCodeItem {
  return {
    inviteId: row.id,
    revokedAt: toIso(row.revoked_at),
  };
}

function mapResolvedInviteCode(row: InviteCodeLookupRow): ResolvedInviteCodeItem {
  return {
    inviteId: row.id,
    instanceId: row.instance_id,
    unitId: row.unit_id,
    expiresAt: toIso(row.expires_at),
  };
}

function normalizeInviteConflict(error: unknown): AppError | null {
  const dbError = error as DbErrorLike;
  if (dbError?.code !== '23505') {
    return null;
  }

  if (dbError.constraint?.includes('invites_token_hash')) {
    return new AppError(409, 'INVITE_TOKEN_CONFLICT', 'Invite token conflict');
  }

  if (dbError.constraint?.includes('ux_users_instance_email')) {
    return new AppError(409, 'USER_EMAIL_CONFLICT', 'Email already exists in this instance');
  }

  return null;
}

async function ensureActiveUnit(client: PoolClient, instanceId: string, unitId: string): Promise<void> {
  const result = await client.query<UnitRow>(
    `
    select id
    from public.units
    where instance_id = $1
      and id = $2
      and archived_at is null
    limit 1
    `,
    [instanceId, unitId],
  );

  if (result.rowCount === 0) {
    throw new AppError(400, 'UNIT_NOT_FOUND', 'Unit not found or archived');
  }
}

function buildListWhere(query: TenantInvitesListQuery): { whereSql: string; params: unknown[] } {
  const clauses = ['i.instance_id = $1'];
  const params: unknown[] = [];

  if (query.unitId) {
    params.push(query.unitId);
    clauses.push(`i.unit_id = $${params.length + 1}`);
  }

  return {
    whereSql: `where ${clauses.join(' and ')}`,
    params,
  };
}

export function generateInviteToken(): { token: string; tokenHash: string } {
  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  return { token, tokenHash };
}

export async function createInvite(params: {
  instanceId: string;
  actorUserId: string;
  input: CreateInviteInput;
  tokenHash: string;
  expiresAt: Date;
}): Promise<InviteItem> {
  try {
    return await withTx(async (client) => {
      await ensureActiveUnit(client, params.instanceId, params.input.unitId);

      const result = await client.query<InviteRow>(
        `
        insert into public.invites (
          instance_id,
          unit_id,
          kind,
          invited_role,
          token_hash,
          expires_at,
          created_by_user_id,
          created_at
        )
        values ($1, $2, 'RESIDENT_JOIN', 'MORADOR', $3, $4, $5, now())
        returning
          id,
          instance_id,
          unit_id,
          kind,
          token_hash,
          expires_at,
          used_at,
          revoked_at,
          created_by_user_id,
          created_at
        `,
        [params.instanceId, params.input.unitId, params.tokenHash, params.expiresAt, params.actorUserId],
      );

      return mapInvite(result.rows[0]);
    });
  } catch (error) {
    const conflict = normalizeInviteConflict(error);
    if (conflict) {
      throw conflict;
    }

    console.error('[INVITES_REPO] createInvite failed', formatDbError(error));
    if (error instanceof AppError) {
      throw error;
    }
    throw Errors.dbError('Failed to create invite');
  }
}

export async function createInviteCode(params: {
  instanceId: string;
  actorUserId: string;
  unitId: string;
  codeHash: string;
  codeLast4: string;
  expiresAt: Date;
}): Promise<InviteCodeItem> {
  try {
    return await withTx(async (client) => {
      await ensureActiveUnit(client, params.instanceId, params.unitId);

      await client.query(
        `
        update public.invites
        set revoked_at = now(),
            cancelled_reason = 'SUPERSEDED_BY_NEW_CODE'
        where instance_id = $1
          and unit_id = $2
          and code_hash is not null
          and used_at is null
          and revoked_at is null
          and cancelled_reason is null
          and expires_at > now()
        `,
        [params.instanceId, params.unitId],
      );

      const { tokenHash } = generateInviteToken();

      const result = await client.query<InviteCodeRow>(
        `
        insert into public.invites (
          instance_id,
          unit_id,
          kind,
          invited_role,
          token_hash,
          code_hash,
          code_last4,
          expires_at,
          created_by_user_id,
          created_at
        )
        values ($1, $2, 'RESIDENT_JOIN', 'MORADOR', $3, $4, $5, $6, $7, now())
        returning
          id,
          code_last4,
          expires_at
        `,
        [
          params.instanceId,
          params.unitId,
          tokenHash,
          params.codeHash,
          params.codeLast4,
          params.expiresAt,
          params.actorUserId,
        ],
      );

      return mapInviteCode(result.rows[0]);
    });
  } catch (error) {
    const conflict = normalizeInviteConflict(error);
    if (conflict) {
      throw conflict;
    }

    console.error('[INVITES_REPO] createInviteCode failed', formatDbError(error));
    if (error instanceof AppError) {
      throw error;
    }
    throw Errors.dbError('Failed to create invite code');
  }
}

export async function getActiveInviteCode(instanceId: string, unitId: string): Promise<InviteCodeItem | null> {
  try {
    const result = await getDbPool().query<InviteCodeRow>(
      `
      select
        i.id,
        i.code_last4,
        i.expires_at
      from public.invites i
      where i.instance_id = $1
        and i.unit_id = $2
        and i.code_hash is not null
        and i.code_last4 is not null
        and i.used_at is null
        and i.revoked_at is null
        and i.cancelled_reason is null
        and i.expires_at > now()
      order by i.created_at desc, i.id desc
      limit 1
      `,
      [instanceId, unitId],
    );

    if (result.rowCount === 0) {
      return null;
    }

    return mapInviteCode(result.rows[0]);
  } catch (error) {
    console.error('[INVITES_REPO] getActiveInviteCode failed', formatDbError(error));
    if (error instanceof AppError) {
      throw error;
    }
    throw Errors.dbError('Failed to load active invite code');
  }
}

export async function cancelActiveInviteCode(params: {
  instanceId: string;
  unitId: string;
  cancelledReason: string;
}): Promise<CancelledInviteCodeItem | null> {
  try {
    const result = await getDbPool().query<CancelledInviteCodeRow>(
      `
      with active_invite as (
        select
          i.id
        from public.invites i
        where i.instance_id = $1
          and i.unit_id = $2
          and i.code_hash is not null
          and i.code_last4 is not null
          and i.used_at is null
          and i.revoked_at is null
          and i.cancelled_reason is null
          and i.expires_at > now()
        order by i.created_at desc, i.id desc
        limit 1
      )
      update public.invites i
      set revoked_at = now(),
          cancelled_reason = $3
      from active_invite
      where i.id = active_invite.id
        and i.instance_id = $1
        and i.code_hash is not null
        and i.code_last4 is not null
        and i.used_at is null
        and i.revoked_at is null
        and i.cancelled_reason is null
        and i.expires_at > now()
      returning
        i.id,
        i.revoked_at
      `,
      [params.instanceId, params.unitId, params.cancelledReason],
    );

    if (result.rowCount === 0) {
      return null;
    }

    return mapCancelledInviteCode(result.rows[0]);
  } catch (error) {
    console.error('[INVITES_REPO] cancelActiveInviteCode failed', formatDbError(error));
    if (error instanceof AppError) {
      throw error;
    }
    throw Errors.dbError('Failed to cancel active invite code');
  }
}

export async function resolveInviteCodeForSignup(params: {
  instanceId: string;
  codeHash: string;
}): Promise<ResolvedInviteCodeItem> {
  try {
    const activeInviteResult = await getDbPool().query<InviteCodeLookupRow>(
      `
      select
        i.id,
        i.instance_id,
        i.unit_id,
        i.kind,
        i.expires_at,
        i.used_at,
        i.used_by_user_id,
        i.revoked_at,
        i.cancelled_reason,
        i.created_by_user_id
      from public.invites i
      where i.instance_id = $1
        and i.code_hash = $2
        and i.revoked_at is null
        and i.cancelled_reason is null
        and i.used_at is null
        and i.expires_at > now()
      order by i.created_at desc, i.id desc
      limit 1
      `,
      [params.instanceId, params.codeHash],
    );

    if ((activeInviteResult.rowCount ?? 0) > 0) {
      return mapResolvedInviteCode(activeInviteResult.rows[0]);
    }

    const latestInviteByCodeResult = await getDbPool().query<InviteCodeLookupRow>(
      `
      select
        i.id,
        i.instance_id,
        i.unit_id,
        i.kind,
        i.expires_at,
        i.used_at,
        i.used_by_user_id,
        i.revoked_at,
        i.cancelled_reason,
        i.created_by_user_id
      from public.invites i
      where i.instance_id = $1
        and i.code_hash = $2
      order by i.created_at desc, i.id desc
      limit 1
      `,
      [params.instanceId, params.codeHash],
    );

    if (latestInviteByCodeResult.rowCount === 0) {
      throw new AppError(400, 'INVALID_CODE', 'Invite code is invalid');
    }

    const latestInviteByCode = latestInviteByCodeResult.rows[0];
    if (latestInviteByCode.used_at) {
      throw new AppError(400, 'INVITE_ALREADY_USED', 'Invite code has already been used');
    }

    if (latestInviteByCode.revoked_at || latestInviteByCode.cancelled_reason) {
      throw new AppError(400, 'INVITE_REVOKED', 'Invite code has been revoked');
    }

    if (new Date(latestInviteByCode.expires_at) <= new Date()) {
      throw new AppError(400, 'INVITE_EXPIRED', 'Invite code has expired');
    }

    throw new AppError(400, 'INVALID_CODE', 'Invite code is invalid');
  } catch (error) {
    const conflict = normalizeInviteConflict(error);
    if (conflict) {
      throw conflict;
    }

    console.error('[INVITES_REPO] resolveInviteCodeForSignup failed', formatDbError(error));
    if (error instanceof AppError) {
      throw error;
    }
    throw Errors.dbError('Failed to resolve invite code');
  }
}

export async function getInviteById(instanceId: string, inviteId: string): Promise<InviteItem | null> {
  try {
    const result = await getDbPool().query<InviteRow>(
      `
      select
        i.id,
        i.instance_id,
        i.unit_id,
        i.kind,
        i.token_hash,
        i.expires_at,
        i.used_at,
        i.revoked_at,
        i.created_by_user_id,
        i.created_at
      from public.invites i
      where i.instance_id = $1
        and i.id = $2
      limit 1
      `,
      [instanceId, inviteId],
    );

    if (result.rowCount === 0) {
      return null;
    }

    return mapInvite(result.rows[0]);
  } catch (error) {
    console.error('[INVITES_REPO] getInviteById failed', formatDbError(error));
    if (error instanceof AppError) {
      throw error;
    }
    throw Errors.dbError('Failed to load invite');
  }
}

export async function listInvites(
  instanceId: string,
  query: TenantInvitesListQuery,
): Promise<PaginatedResponse<InviteItem>> {
  try {
    const built = buildListWhere(query);
    const sharedParams = [instanceId, ...built.params];

    const countResult = await getDbPool().query<TotalRow>(
      `
      select count(*)::bigint as total
      from public.invites i
      ${built.whereSql}
      `,
      sharedParams,
    );

    const dataParams = [...sharedParams, query.limit, (query.page - 1) * query.limit];
    const limitBind = `$${dataParams.length - 1}`;
    const offsetBind = `$${dataParams.length}`;

    const dataResult = await getDbPool().query<InviteRow>(
      `
      select
        i.id,
        i.instance_id,
        i.unit_id,
        i.kind,
        i.token_hash,
        i.expires_at,
        i.used_at,
        i.revoked_at,
        i.created_by_user_id,
        i.created_at
      from public.invites i
      ${built.whereSql}
      order by i.created_at desc, i.id desc
      limit ${limitBind}
      offset ${offsetBind}
      `,
      dataParams,
    );

    const total = countResult.rows[0] ? Number.parseInt(countResult.rows[0].total, 10) : 0;

    return {
      items: dataResult.rows.map(mapInvite),
      total: Number.isNaN(total) ? 0 : total,
      page: query.page,
      limit: query.limit,
    };
  } catch (error) {
    console.error('[INVITES_REPO] listInvites failed', formatDbError(error));
    if (error instanceof AppError) {
      throw error;
    }
    throw Errors.dbError('Failed to list invites');
  }
}

export async function revokeInvite(instanceId: string, inviteId: string): Promise<InviteItem | null> {
  try {
    const result = await getDbPool().query<InviteRow>(
      `
      update public.invites
      set revoked_at = now()
      where instance_id = $1
        and id = $2
        and revoked_at is null
      returning
        id,
        instance_id,
        unit_id,
        kind,
        token_hash,
        expires_at,
        used_at,
        revoked_at,
        created_by_user_id,
        created_at
      `,
      [instanceId, inviteId],
    );

    if (result.rowCount === 0) {
      return null;
    }

    return mapInvite(result.rows[0]);
  } catch (error) {
    console.error('[INVITES_REPO] revokeInvite failed', formatDbError(error));
    if (error instanceof AppError) {
      throw error;
    }
    throw Errors.dbError('Failed to revoke invite');
  }
}
