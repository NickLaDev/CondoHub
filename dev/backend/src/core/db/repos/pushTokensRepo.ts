import { AppError, Errors } from '../../contract/errors';
import { formatDbError, getDbPool } from '../../../db/pool';

type PushPlatform = 'android' | 'ios' | 'web';

export type RegisterPushTokenInput = {
  instanceId: string;
  userId: string;
  platform: PushPlatform;
  token: string;
};

const REGISTER_WITH_LAST_SEEN_SQL = `
with candidate as (
  select pt.id
  from public.push_tokens pt
  where pt.instance_id = $1
    and pt.token = $4
  order by (pt.revoked_at is null) desc, pt.created_at desc, pt.id desc
  limit 1
),
updated as (
  update public.push_tokens pt
  set
    user_id = $2,
    platform = $3,
    revoked_at = null,
    last_seen_at = now()
  where pt.id in (select id from candidate)
  returning pt.id
)
insert into public.push_tokens (
  instance_id,
  user_id,
  platform,
  token,
  revoked_at,
  last_seen_at
)
select
  $1,
  $2,
  $3,
  $4,
  null,
  now()
where not exists (select 1 from updated);
`;

const REGISTER_LEGACY_SQL = `
with candidate as (
  select pt.id
  from public.push_tokens pt
  where pt.instance_id = $1
    and pt.token = $4
  order by (pt.revoked_at is null) desc, pt.created_at desc, pt.id desc
  limit 1
),
updated as (
  update public.push_tokens pt
  set
    user_id = $2,
    platform = $3,
    revoked_at = null
  where pt.id in (select id from candidate)
  returning pt.id
)
insert into public.push_tokens (
  instance_id,
  user_id,
  platform,
  token,
  revoked_at
)
select
  $1,
  $2,
  $3,
  $4,
  null
where not exists (select 1 from updated);
`;

function getDbErrorCode(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === 'string') {
      return code;
    }
  }
  return undefined;
}

function isMissingLastSeenColumn(error: unknown): boolean {
  const code = getDbErrorCode(error);
  const message = error instanceof Error ? error.message : String(error);
  return code === '42703' && message.includes('last_seen_at');
}

function mapRegisterError(error: unknown): never {
  const code = getDbErrorCode(error);
  if (code === '23505') {
    throw new AppError(409, 'PUSH_TOKEN_CONFLICT', 'Push token already registered');
  }

  if (error instanceof AppError) {
    throw error;
  }

  throw Errors.dbError('Failed to register push token');
}

export async function registerPushToken(input: RegisterPushTokenInput): Promise<void> {
  const params = [input.instanceId, input.userId, input.platform, input.token];

  try {
    await getDbPool().query(REGISTER_WITH_LAST_SEEN_SQL, params);
    return;
  } catch (error) {
    if (!isMissingLastSeenColumn(error)) {
      console.error('[PUSH_TOKENS_REPO] registerPushToken failed', formatDbError(error));
      mapRegisterError(error);
    }
  }

  try {
    await getDbPool().query(REGISTER_LEGACY_SQL, params);
  } catch (error) {
    console.error('[PUSH_TOKENS_REPO] registerPushToken (legacy fallback) failed', formatDbError(error));
    mapRegisterError(error);
  }
}
