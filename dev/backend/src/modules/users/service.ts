import { AppError } from '../../core/contract/errors';
import { RequestContext } from '../../core/contract/requestContext';
import { getAuditService } from '../../core/services/audit/audit.factory';
import {
  CreateResidentInput,
  CreateStaffInput,
  PatchResidentInput,
  PatchStaffInput,
  TenantUsersListQuery,
} from './dto';
import {
  createResident,
  createStaff,
  disableTenantUser,
  getTenantUserById,
  isResident,
  isStaff,
  listResidents,
  listStaff,
  TenantUser,
  updateResident,
  updateStaff,
} from './repo';

function ensureResidentUser(user: TenantUser): void {
  if (!isResident(user)) {
    throw new AppError(400, 'USER_NOT_RESIDENT', 'Target user is not a resident');
  }
}

function ensureStaffUser(user: TenantUser): void {
  if (!isStaff(user)) {
    throw new AppError(400, 'USER_NOT_STAFF', 'Target user is not a staff user');
  }
}

async function loadTenantUserOrFail(ctx: RequestContext, userId: string): Promise<TenantUser> {
  const user = await getTenantUserById(ctx.instanceId, userId);
  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
  }
  return user;
}

export async function listResidentsService(ctx: RequestContext, query: TenantUsersListQuery) {
  return listResidents(ctx.instanceId, query);
}

export async function createResidentService(ctx: RequestContext, input: CreateResidentInput): Promise<TenantUser> {
  const created = await createResident(ctx.instanceId, input);

  await getAuditService().log(ctx, {
    action: 'USER_RESIDENT_CREATED',
    targetType: 'user',
    targetId: created.id,
    metadata: {
      unitId: created.unitId,
      email: created.email,
      status: created.status,
      roles: created.roles,
    },
  });

  return created;
}

export async function patchResidentService(
  ctx: RequestContext,
  userId: string,
  input: PatchResidentInput,
): Promise<TenantUser> {
  const existing = await loadTenantUserOrFail(ctx, userId);
  ensureResidentUser(existing);

  const updated = await updateResident(ctx.instanceId, userId, input);
  if (!updated) {
    throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
  }

  ensureResidentUser(updated);

  await getAuditService().log(ctx, {
    action: 'USER_RESIDENT_UPDATED',
    targetType: 'user',
    targetId: updated.id,
    metadata: {
      previousUnitId: existing.unitId,
      nextUnitId: updated.unitId,
      previousEmail: existing.email,
      nextEmail: updated.email,
      updatedFields: Object.keys(input),
    },
  });

  return updated;
}

export async function disableResidentService(ctx: RequestContext, userId: string): Promise<TenantUser> {
  const existing = await loadTenantUserOrFail(ctx, userId);
  ensureResidentUser(existing);

  if (existing.status !== 'ACTIVE') {
    throw new AppError(409, 'USER_ALREADY_DISABLED', 'User is already disabled');
  }

  const disabled = await disableTenantUser(ctx.instanceId, userId);
  if (!disabled) {
    throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
  }

  await getAuditService().log(ctx, {
    action: 'USER_RESIDENT_DISABLED',
    targetType: 'user',
    targetId: disabled.id,
    metadata: {
      status: disabled.status,
      tokenVersion: disabled.tokenVersion,
    },
  });

  return disabled;
}

export async function listStaffService(ctx: RequestContext, query: TenantUsersListQuery) {
  return listStaff(ctx.instanceId, query);
}

export async function createStaffService(ctx: RequestContext, input: CreateStaffInput): Promise<TenantUser> {
  const created = await createStaff(ctx.instanceId, input);

  await getAuditService().log(ctx, {
    action: 'USER_STAFF_CREATED',
    targetType: 'user',
    targetId: created.id,
    metadata: {
      role: created.roles[0] ?? null,
      email: created.email,
      status: created.status,
    },
  });

  return created;
}

export async function patchStaffService(
  ctx: RequestContext,
  userId: string,
  input: PatchStaffInput,
): Promise<TenantUser> {
  const existing = await loadTenantUserOrFail(ctx, userId);
  ensureStaffUser(existing);

  const updated = await updateStaff(ctx.instanceId, userId, input);
  if (!updated) {
    throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
  }

  ensureStaffUser(updated);

  await getAuditService().log(ctx, {
    action: 'USER_STAFF_UPDATED',
    targetType: 'user',
    targetId: updated.id,
    metadata: {
      previousRole: existing.roles[0] ?? null,
      nextRole: updated.roles[0] ?? null,
      previousEmail: existing.email,
      nextEmail: updated.email,
      updatedFields: Object.keys(input),
    },
  });

  return updated;
}

export async function disableStaffService(ctx: RequestContext, userId: string): Promise<TenantUser> {
  const existing = await loadTenantUserOrFail(ctx, userId);
  ensureStaffUser(existing);

  if (existing.status !== 'ACTIVE') {
    throw new AppError(409, 'USER_ALREADY_DISABLED', 'User is already disabled');
  }

  const disabled = await disableTenantUser(ctx.instanceId, userId);
  if (!disabled) {
    throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
  }

  await getAuditService().log(ctx, {
    action: 'USER_STAFF_DISABLED',
    targetType: 'user',
    targetId: disabled.id,
    metadata: {
      status: disabled.status,
      tokenVersion: disabled.tokenVersion,
    },
  });

  return disabled;
}
