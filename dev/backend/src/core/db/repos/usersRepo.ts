import { AppError, Errors } from '../../contract/errors';
import { AuthUser } from '../../../modules/auth/auth.types';
import { formatDbError, getDbPool } from '../../../db/pool';
import { InstanceStatus } from '../../../modules/instances/instances.types';

type UserRow = {
  id: string;
  instance_id: string | null;
  instance_key?: string | null;
  instance_name?: string | null;
  unit_id: string | null;
  unit_label?: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  roles: string[];
  token_version: number;
  status: string;
};

export type ActiveTenantAuthUser = AuthUser & {
  instanceId: string;
  instanceKey: string;
  instanceName: string;
  instanceStatus: InstanceStatus;
};

type ActiveTenantUserRow = UserRow & {
  instance_id: string;
  instance_key: string;
  instance_name: string;
  instance_status: InstanceStatus;
};

function mapUser(row: UserRow): AuthUser {
  return {
    id: row.id,
    instanceId: row.instance_id,
    instanceKey: row.instance_key,
    instanceName: row.instance_name,
    unitId: row.unit_id,
    unitLabel: row.unit_label,
    name: row.name,
    email: row.email,
    phone: row.phone,
    roles: row.roles,
    tokenVersion: row.token_version,
    status: row.status,
  };
}

function mapActiveTenantUser(row: ActiveTenantUserRow): ActiveTenantAuthUser {
  return {
    ...mapUser(row),
    instanceId: row.instance_id,
    instanceKey: row.instance_key,
    instanceName: row.instance_name,
    instanceStatus: row.instance_status,
  };
}

const ACTIVE_TENANT_AUTH_USER_SELECT = `
  select
    usr.id,
    usr.instance_id,
    inst.instance_key,
    inst.name as instance_name,
    inst.status as instance_status,
    usr.unit_id,
    case
      when unit.id is null then null
      else concat_ws(' - ', coalesce(block.label, block.name), coalesce(unit.label, unit.number))
    end as unit_label,
    usr.name,
    usr.email,
    usr.phone,
    usr.roles,
    usr.token_version,
    usr.status
  from public.users usr
  join public.instances inst on inst.id = usr.instance_id
  left join public.units unit
    on unit.instance_id = usr.instance_id
   and unit.id = usr.unit_id
  left join public.blocks block
    on block.instance_id = unit.instance_id
   and block.id = unit.block_id
`;

async function queryUserByEmail(query: string, params: unknown[]): Promise<AuthUser | null> {
  try {
    const result = await getDbPool().query<UserRow>(query, params);

    if (result.rowCount === 0) {
      return null;
    }

    return mapUser(result.rows[0]);
  } catch (error) {
    console.error('[USERS_REPO] queryUserByEmail failed', formatDbError(error));
    if (error instanceof AppError) {
      throw error;
    }
    throw Errors.dbError('Failed to load user by email');
  }
}

export async function findActiveTenantUsersByEmail(email: string): Promise<ActiveTenantAuthUser[]> {
  try {
    const result = await getDbPool().query<ActiveTenantUserRow>(
      `
      ${ACTIVE_TENANT_AUTH_USER_SELECT}
      where usr.instance_id is not null
        and usr.status = 'ACTIVE'
        and lower(usr.email) = lower($1)
      order by inst.instance_key asc, usr.id asc
      `,
      [email],
    );

    return result.rows.map(mapActiveTenantUser);
  } catch (error) {
    console.error('[USERS_REPO] findActiveTenantUsersByEmail failed', formatDbError(error));
    if (error instanceof AppError) {
      throw error;
    }
    throw Errors.dbError('Failed to load tenant users by email');
  }
}

export async function getActiveTenantUserByIdAndInstanceId(
  userId: string,
  instanceId: string,
): Promise<ActiveTenantAuthUser | null> {
  try {
    const result = await getDbPool().query<ActiveTenantUserRow>(
      `
      ${ACTIVE_TENANT_AUTH_USER_SELECT}
      where usr.id = $1
        and usr.instance_id = $2
        and usr.status = 'ACTIVE'
      limit 1
      `,
      [userId, instanceId],
    );

    if (result.rowCount === 0) {
      return null;
    }

    return mapActiveTenantUser(result.rows[0]);
  } catch (error) {
    console.error('[USERS_REPO] getActiveTenantUserByIdAndInstanceId failed', formatDbError(error));
    if (error instanceof AppError) {
      throw error;
    }
    throw Errors.dbError('Failed to load tenant user by selection');
  }
}

export async function getTenantUserByEmail(instanceId: string, email: string): Promise<AuthUser | null> {
  return queryUserByEmail(
    `
    select u.id, u.instance_id, u.unit_id, u.name, u.email, u.phone, u.roles, u.token_version, u.status
    from public.users u
    where u.instance_id = $1
      and u.status = 'ACTIVE'
      and lower(u.email) = lower($2)
    limit 1
    `,
    [instanceId, email],
  );
}

export async function getAdminUserByEmail(email: string): Promise<AuthUser | null> {
  return queryUserByEmail(
    `
    select u.id, u.instance_id, u.unit_id, u.name, u.email, u.phone, u.roles, u.token_version, u.status
    from public.users u
    where u.instance_id is null
      and u.status = 'ACTIVE'
      and lower(u.email) = lower($1)
    limit 1
    `,
    [email],
  );
}

export async function getUserById(userId: string): Promise<AuthUser | null> {
  try {
    const result = await getDbPool().query<UserRow>(
      `
      select u.id, u.instance_id, u.unit_id, u.name, u.email, u.phone, u.roles, u.token_version, u.status
      from public.users u
      where u.id = $1
      limit 1
      `,
      [userId],
    );

    if (result.rowCount === 0) {
      return null;
    }

    return mapUser(result.rows[0]);
  } catch (error) {
    console.error('[USERS_REPO] getUserById failed', formatDbError(error));
    if (error instanceof AppError) {
      throw error;
    }
    throw Errors.dbError('Failed to load user by id');
  }
}

type PasswordCheckRow = {
  ok: boolean;
};

export async function verifyPassword(userId: string, passwordPlain: string): Promise<boolean> {
  try {
    const result = await getDbPool().query<PasswordCheckRow>(
      `
      with latest_credential as (
        select uc.password_hash
        from public.user_credentials uc
        where uc.user_id = $1
        order by uc.password_updated_at desc nulls last, uc.created_at desc
        limit 1
      )
      select (lc.password_hash = crypt($2, lc.password_hash)) as ok
      from latest_credential lc
      `,
      [userId, passwordPlain],
    );

    if (result.rowCount === 0) {
      return false;
    }

    return Boolean(result.rows[0].ok);
  } catch (error) {
    console.error('[USERS_REPO] verifyPassword failed', formatDbError(error));
    if (error instanceof AppError) {
      throw error;
    }
    throw Errors.dbError('Failed to verify password');
  }
}
