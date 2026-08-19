import { PoolClient } from 'pg';
import {
  ACCESS_TTL_SECONDS,
  generateRefreshToken,
  getRefreshExpiry,
  hashRefreshToken,
  signAccessToken,
} from '../../core/auth/tokens';
import { AppError, Errors } from '../../core/contract/errors';
import { formatDbError } from '../../db/pool';
import { withTx } from '../../db/tx';
import { AuthSuccessResponse } from './auth.types';

type DbErrorLike = Error & {
  code?: string;
  constraint?: string;
};

type InviteRow = {
  id: string;
  instance_id: string;
  unit_id: string;
  kind: string;
  expires_at: Date | string;
  used_at: Date | string | null;
  revoked_at: Date | string | null;
  cancelled_reason: string | null;
};

type CreatedUserRow = {
  id: string;
  instance_id: string;
  unit_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  roles: string[];
  token_version: number;
  status: string;
};

type InviteConsumedRow = {
  id: string;
};

type RegisterWithInviteInput = {
  instanceId: string;
  inviteId: string;
  unitId: string;
  name: string;
  email: string;
  password: string;
  phone?: string | null;
};

function normalizeEmail(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed.toLowerCase();
}

function normalizePhone(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function normalizeUsersUniqueConflict(error: unknown): AppError | null {
  const dbError = error as DbErrorLike;
  if (dbError?.code !== '23505') {
    return null;
  }

  if (dbError.constraint?.includes('ux_users_instance_email')) {
    return new AppError(409, 'USER_EMAIL_CONFLICT', 'Email already exists in this instance');
  }

  return null;
}

function toDate(value: Date | string): Date {
  if (value instanceof Date) {
    return value;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError(400, 'INVALID_INVITE_CONTEXT', 'Invite context is invalid');
  }

  return parsed;
}

async function loadInviteForUpdate(client: PoolClient, input: RegisterWithInviteInput): Promise<InviteRow> {
  const inviteResult = await client.query<InviteRow>(
    `
    select
      i.id,
      i.instance_id,
      i.unit_id,
      i.kind,
      i.expires_at,
      i.used_at,
      i.revoked_at,
      i.cancelled_reason
    from public.invites i
    where i.instance_id = $1
      and i.id = $2
      and i.unit_id = $3
    limit 1
    for update
    `,
    [input.instanceId, input.inviteId, input.unitId],
  );

  if ((inviteResult.rowCount ?? 0) === 0) {
    throw new AppError(400, 'INVALID_INVITE_CONTEXT', 'Invite context is invalid');
  }

  return inviteResult.rows[0];
}

function ensureInviteCanBeConsumed(invite: InviteRow): void {
  if (invite.kind !== 'RESIDENT_JOIN') {
    throw new AppError(400, 'INVALID_INVITE_CONTEXT', 'Invite context is invalid');
  }

  if (invite.revoked_at || invite.cancelled_reason) {
    throw new AppError(400, 'INVITE_REVOKED', 'Invite has been revoked');
  }

  if (invite.used_at) {
    throw new AppError(400, 'INVITE_ALREADY_USED', 'Invite has already been used');
  }

  if (toDate(invite.expires_at) <= new Date()) {
    throw new AppError(400, 'INVITE_EXPIRED', 'Invite has expired');
  }
}

async function createResidentUser(client: PoolClient, input: RegisterWithInviteInput): Promise<CreatedUserRow> {
  try {
    const result = await client.query<CreatedUserRow>(
      `
      insert into public.users (
        instance_id,
        unit_id,
        name,
        email,
        phone,
        roles,
        status,
        token_version,
        created_at,
        updated_at
      )
      values ($1, $2, $3, $4, $5, array['MORADOR']::text[], 'ACTIVE', 1, now(), now())
      returning
        id,
        instance_id,
        unit_id,
        name,
        email,
        phone,
        roles,
        token_version,
        status
      `,
      [
        input.instanceId,
        input.unitId,
        input.name,
        normalizeEmail(input.email),
        normalizePhone(input.phone),
      ],
    );

    return result.rows[0];
  } catch (error) {
    const conflict = normalizeUsersUniqueConflict(error);
    if (conflict) {
      throw conflict;
    }

    throw error;
  }
}

async function createCredential(client: PoolClient, userId: string, password: string): Promise<void> {
  await client.query(
    `
    insert into public.user_credentials (
      user_id,
      password_hash,
      password_updated_at,
      created_at,
      updated_at
    )
    values ($1, crypt($2, gen_salt('bf')), now(), now(), now())
    `,
    [userId, password],
  );
}

async function consumeInvite(client: PoolClient, input: RegisterWithInviteInput, userId: string): Promise<void> {
  const consumeResult = await client.query<InviteConsumedRow>(
    `
    update public.invites
    set
      used_at = now(),
      used_by_user_id = $4
    where instance_id = $1
      and id = $2
      and unit_id = $3
      and revoked_at is null
      and cancelled_reason is null
      and used_at is null
      and expires_at > now()
    returning id
    `,
    [input.instanceId, input.inviteId, input.unitId, userId],
  );

  if ((consumeResult.rowCount ?? 0) > 0) {
    return;
  }

  const latestInvite = await loadInviteForUpdate(client, input);

  if (latestInvite.revoked_at || latestInvite.cancelled_reason) {
    throw new AppError(400, 'INVITE_REVOKED', 'Invite has been revoked');
  }

  if (latestInvite.used_at) {
    throw new AppError(400, 'INVITE_ALREADY_USED', 'Invite has already been used');
  }

  if (toDate(latestInvite.expires_at) <= new Date()) {
    throw new AppError(400, 'INVITE_EXPIRED', 'Invite has expired');
  }

  throw new AppError(400, 'INVALID_INVITE_CONTEXT', 'Invite context is invalid');
}

async function createSession(client: PoolClient, input: RegisterWithInviteInput, user: CreatedUserRow): Promise<string> {
  const refreshToken = generateRefreshToken(user.token_version);
  const refreshHash = hashRefreshToken(refreshToken);
  const refreshExpiresAt = getRefreshExpiry();

  await client.query(
    `
    insert into public.sessions (instance_id, user_id, refresh_hash, expires_at, created_at)
    values ($1, $2, $3, $4, now())
    `,
    [input.instanceId, user.id, refreshHash, refreshExpiresAt],
  );

  return refreshToken;
}

function buildAuthSuccessResponse(user: CreatedUserRow, refreshToken: string): AuthSuccessResponse {
  const accessToken = signAccessToken({
    sub: user.id,
    iid: user.instance_id,
    uid: user.unit_id,
    roles: user.roles,
    tv: user.token_version,
  });

  return {
    accessToken,
    refreshToken,
    expiresInSec: ACCESS_TTL_SECONDS,
    user: {
      id: user.id,
      instanceId: user.instance_id,
      unitId: user.unit_id,
      roles: user.roles,
      name: user.name,
      email: user.email,
      phone: user.phone,
    },
  };
}

export async function registerWithInvite(input: RegisterWithInviteInput): Promise<AuthSuccessResponse> {
  try {
    return await withTx(async (client) => {
      const invite = await loadInviteForUpdate(client, input);
      ensureInviteCanBeConsumed(invite);

      const createdUser = await createResidentUser(client, input);
      await createCredential(client, createdUser.id, input.password);
      await consumeInvite(client, input, createdUser.id);
      const refreshToken = await createSession(client, input, createdUser);

      return buildAuthSuccessResponse(createdUser, refreshToken);
    });
  } catch (error) {
    const conflict = normalizeUsersUniqueConflict(error);
    if (conflict) {
      throw conflict;
    }

    console.error('[AUTH_REGISTER_WITH_INVITE_REPO] registerWithInvite failed', formatDbError(error));
    if (error instanceof AppError) {
      throw error;
    }
    throw Errors.dbError('Failed to register with invite');
  }
}
