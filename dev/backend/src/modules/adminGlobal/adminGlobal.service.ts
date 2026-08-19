import { AppError, Errors } from '../../core/contract/errors';
import { PaginatedResponse } from '../../core/contract/pagination';
import { RequestContext } from '../../core/contract/requestContext';
import { ROLES } from '../../core/contract/roles';
import { getAuditService } from '../../core/services/audit/audit.factory';
import {
  AdminInstancesListQuery,
  AdminPlansListQuery,
  CreateAdminInstanceInput,
  CreateAdminPlanInput,
  ResetSindicoSupportInput,
  UpdateAdminInstanceInput,
  UpdateAdminPlanInput,
} from './adminGlobal.dto';
import {
  AdminInstance,
  AdminPlan,
  AdminStats,
  SupportSindicoUser,
  adminInstanceKeyExists,
  archiveAdminPlan,
  createAdminInstance,
  createAdminPlan,
  findSupportSindicoByEmail,
  findSupportSindicoByUserId,
  getAdminInstanceById,
  getAdminPlanById,
  getAdminStats,
  listAdminInstances,
  listAdminPlans,
  listInstanceIdsByPlanId,
  resetSupportUserCredential,
  setAdminInstanceStatus,
  updateAdminInstance,
  updateAdminPlan,
} from './adminGlobal.repo';

type ResetSindicoSupportResult = {
  ok: true;
  instanceId: string;
  userId: string;
};

function ensureAdminGlobalActor(ctx: RequestContext): void {
  const actor = ctx.actor;
  if (!actor) {
    throw Errors.authRequired();
  }

  if (!actor.roles.includes(ROLES.ADMIN_GLOBAL)) {
    throw Errors.permissionDenied();
  }
}

function buildInstanceAuditContext(ctx: RequestContext, instanceId: string): RequestContext {
  return {
    instanceId,
    actor: ctx.actor,
    requestMeta: ctx.requestMeta,
  };
}

async function logInstanceScopedAdminAction(
  ctx: RequestContext,
  instanceId: string,
  entry: {
    action: string;
    targetType: string;
    targetId?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  await getAuditService().log(buildInstanceAuditContext(ctx, instanceId), entry);
}

function normalizeInstanceKeyCandidate(value: string): string {
  const base = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

  return base || 'instance';
}

function withSuffix(base: string, suffix: number): string {
  if (suffix === 0) {
    return base.slice(0, 64);
  }

  const suffixText = `-${suffix + 1}`;
  const maxBaseLength = Math.max(1, 64 - suffixText.length);
  return `${base.slice(0, maxBaseLength)}${suffixText}`;
}

async function generateUniqueInstanceKey(name: string): Promise<string> {
  const base = normalizeInstanceKeyCandidate(name);
  const maxAttempts = 500;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const candidate = withSuffix(base, attempt);
    const exists = await adminInstanceKeyExists(candidate);
    if (!exists) {
      return candidate;
    }
  }

  throw new AppError(409, 'INSTANCE_KEY_CONFLICT', 'Could not generate a unique instance key');
}

async function ensureAssignablePlan(planId: string): Promise<void> {
  const plan = await getAdminPlanById(planId);
  if (!plan) {
    throw new AppError(404, 'PLAN_NOT_FOUND', 'Plan not found');
  }

  if (plan.archivedAt) {
    throw new AppError(400, 'PLAN_ARCHIVED', 'Archived plan cannot be assigned to an instance');
  }
}

async function loadPlanOrFail(planId: string): Promise<AdminPlan> {
  const plan = await getAdminPlanById(planId);
  if (!plan) {
    throw new AppError(404, 'PLAN_NOT_FOUND', 'Plan not found');
  }
  return plan;
}

function toAuditMetadata(value: Record<string, unknown>): Record<string, unknown> {
  return value;
}

async function logPlanActionForLinkedInstances(
  ctx: RequestContext,
  planId: string,
  action: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  const instanceIds = await listInstanceIdsByPlanId(planId);
  for (const instanceId of instanceIds) {
    await logInstanceScopedAdminAction(ctx, instanceId, {
      action,
      targetType: 'plan',
      targetId: planId,
      metadata,
    });
  }
}

function ensureActiveSupportTarget(user: SupportSindicoUser): void {
  if (!user.roles.includes(ROLES.SINDICO_ADMIN)) {
    throw new AppError(
      400,
      'SUPPORT_TARGET_NOT_SINDICO',
      'Target user is not a SINDICO_ADMIN for this instance',
    );
  }

  if (user.status !== 'ACTIVE') {
    throw new AppError(409, 'SUPPORT_TARGET_DISABLED', 'Target user is not active');
  }
}

async function resolveSupportTarget(
  input: ResetSindicoSupportInput,
): Promise<SupportSindicoUser | null> {
  if (input.userId) {
    return findSupportSindicoByUserId(input.instanceId, input.userId);
  }

  if (input.email) {
    return findSupportSindicoByEmail(input.instanceId, input.email);
  }

  return null;
}

export async function listAdminInstancesService(
  ctx: RequestContext,
  query: AdminInstancesListQuery,
): Promise<PaginatedResponse<AdminInstance>> {
  ensureAdminGlobalActor(ctx);
  return listAdminInstances(query);
}

export async function createAdminInstanceService(
  ctx: RequestContext,
  input: CreateAdminInstanceInput,
): Promise<AdminInstance> {
  ensureAdminGlobalActor(ctx);

  if (input.planId) {
    await ensureAssignablePlan(input.planId);
  }

  const instanceKey = input.instanceKey ?? (await generateUniqueInstanceKey(input.name));
  const created = await createAdminInstance({
    ...input,
    instanceKey,
  });

  await logInstanceScopedAdminAction(ctx, created.id, {
    action: 'ADMIN_INSTANCE_CREATED',
    targetType: 'instance',
    targetId: created.id,
    metadata: toAuditMetadata({
      instanceKey: created.instanceKey,
      planId: created.planId,
    }),
  });

  return created;
}

export async function getAdminInstanceByIdService(
  ctx: RequestContext,
  instanceId: string,
): Promise<AdminInstance> {
  ensureAdminGlobalActor(ctx);
  const instance = await getAdminInstanceById(instanceId);
  if (!instance) {
    throw new AppError(404, 'INSTANCE_NOT_FOUND', 'Instance not found');
  }
  return instance;
}

export async function updateAdminInstanceService(
  ctx: RequestContext,
  instanceId: string,
  input: UpdateAdminInstanceInput,
): Promise<AdminInstance> {
  ensureAdminGlobalActor(ctx);
  const existing = await getAdminInstanceById(instanceId);
  if (!existing) {
    throw new AppError(404, 'INSTANCE_NOT_FOUND', 'Instance not found');
  }

  if (input.planId) {
    await ensureAssignablePlan(input.planId);
  }

  const updated = await updateAdminInstance(instanceId, input);
  if (!updated) {
    throw new AppError(404, 'INSTANCE_NOT_FOUND', 'Instance not found');
  }

  await logInstanceScopedAdminAction(ctx, updated.id, {
    action: 'ADMIN_INSTANCE_UPDATED',
    targetType: 'instance',
    targetId: updated.id,
    metadata: toAuditMetadata({
      previousName: existing.name,
      nextName: updated.name,
      previousPlanId: existing.planId,
      nextPlanId: updated.planId,
    }),
  });

  return updated;
}

export async function suspendAdminInstanceService(
  ctx: RequestContext,
  instanceId: string,
): Promise<AdminInstance> {
  ensureAdminGlobalActor(ctx);
  const existing = await getAdminInstanceById(instanceId);
  if (!existing) {
    throw new AppError(404, 'INSTANCE_NOT_FOUND', 'Instance not found');
  }

  if (existing.status === 'SUSPENDED') {
    throw new AppError(409, 'INSTANCE_ALREADY_SUSPENDED', 'Instance already suspended');
  }

  const updated = await setAdminInstanceStatus(instanceId, 'SUSPENDED');
  if (!updated) {
    throw new AppError(404, 'INSTANCE_NOT_FOUND', 'Instance not found');
  }

  await logInstanceScopedAdminAction(ctx, updated.id, {
    action: 'ADMIN_INSTANCE_SUSPENDED',
    targetType: 'instance',
    targetId: updated.id,
    metadata: toAuditMetadata({
      previousStatus: existing.status,
      nextStatus: updated.status,
    }),
  });

  return updated;
}

export async function reactivateAdminInstanceService(
  ctx: RequestContext,
  instanceId: string,
): Promise<AdminInstance> {
  ensureAdminGlobalActor(ctx);
  const existing = await getAdminInstanceById(instanceId);
  if (!existing) {
    throw new AppError(404, 'INSTANCE_NOT_FOUND', 'Instance not found');
  }

  if (existing.status === 'ACTIVE') {
    throw new AppError(409, 'INSTANCE_ALREADY_ACTIVE', 'Instance already active');
  }

  const updated = await setAdminInstanceStatus(instanceId, 'ACTIVE');
  if (!updated) {
    throw new AppError(404, 'INSTANCE_NOT_FOUND', 'Instance not found');
  }

  await logInstanceScopedAdminAction(ctx, updated.id, {
    action: 'ADMIN_INSTANCE_REACTIVATED',
    targetType: 'instance',
    targetId: updated.id,
    metadata: toAuditMetadata({
      previousStatus: existing.status,
      nextStatus: updated.status,
    }),
  });

  return updated;
}

export async function listAdminPlansService(
  ctx: RequestContext,
  query: AdminPlansListQuery,
): Promise<PaginatedResponse<AdminPlan>> {
  ensureAdminGlobalActor(ctx);
  return listAdminPlans(query);
}

export async function createAdminPlanService(
  ctx: RequestContext,
  input: CreateAdminPlanInput,
): Promise<AdminPlan> {
  ensureAdminGlobalActor(ctx);
  const created = await createAdminPlan(input);

  await logPlanActionForLinkedInstances(ctx, created.id, 'ADMIN_PLAN_CREATED', {
    name: created.name,
  });

  return created;
}

export async function getAdminPlanByIdService(ctx: RequestContext, planId: string): Promise<AdminPlan> {
  ensureAdminGlobalActor(ctx);
  return loadPlanOrFail(planId);
}

export async function updateAdminPlanService(
  ctx: RequestContext,
  planId: string,
  input: UpdateAdminPlanInput,
): Promise<AdminPlan> {
  ensureAdminGlobalActor(ctx);
  await loadPlanOrFail(planId);

  const updated = await updateAdminPlan(planId, input);
  if (!updated) {
    throw new AppError(404, 'PLAN_NOT_FOUND', 'Plan not found');
  }

  await logPlanActionForLinkedInstances(ctx, updated.id, 'ADMIN_PLAN_UPDATED', {
    updatedFields: Object.keys(input),
  });

  return updated;
}

export async function archiveAdminPlanService(ctx: RequestContext, planId: string): Promise<AdminPlan> {
  ensureAdminGlobalActor(ctx);
  const existing = await loadPlanOrFail(planId);
  if (existing.archivedAt) {
    throw new AppError(409, 'PLAN_ALREADY_ARCHIVED', 'Plan already archived');
  }

  const archived = await archiveAdminPlan(planId);
  if (!archived) {
    throw new AppError(404, 'PLAN_NOT_FOUND', 'Plan not found');
  }

  await logPlanActionForLinkedInstances(ctx, archived.id, 'ADMIN_PLAN_ARCHIVED', {
    archivedAt: archived.archivedAt,
  });

  return archived;
}

export async function getAdminStatsService(ctx: RequestContext): Promise<AdminStats> {
  ensureAdminGlobalActor(ctx);
  return getAdminStats();
}

export async function resetSindicoSupportService(
  ctx: RequestContext,
  input: ResetSindicoSupportInput,
): Promise<ResetSindicoSupportResult> {
  ensureAdminGlobalActor(ctx);

  const instance = await getAdminInstanceById(input.instanceId);
  if (!instance) {
    throw new AppError(404, 'INSTANCE_NOT_FOUND', 'Instance not found');
  }

  const target = await resolveSupportTarget(input);
  if (!target) {
    throw new AppError(404, 'SUPPORT_SINDICO_NOT_FOUND', 'Target SINDICO_ADMIN not found');
  }

  ensureActiveSupportTarget(target);

  const updatedCredential = await resetSupportUserCredential({
    userId: target.id,
    newPassword: input.newPassword,
  });

  await logInstanceScopedAdminAction(ctx, target.instanceId, {
    action: 'ADMIN_SUPPORT_RESET_SINDICO',
    targetType: 'user',
    targetId: target.id,
    metadata: toAuditMetadata({
      targetEmail: target.email,
      tokenVersion: updatedCredential.tokenVersion,
    }),
  });

  return {
    ok: true,
    instanceId: target.instanceId,
    userId: target.id,
  };
}
