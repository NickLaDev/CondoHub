import { AppError } from '../../core/contract/errors';
import { RequestContext } from '../../core/contract/requestContext';
import { getAuditService } from '../../core/services/audit/audit.factory';
import {
  CreateBlockInput,
  CreateUnitInput,
  PatchBlockInput,
  PatchUnitInput,
  StructureListQuery,
} from './dto';
import {
  archiveBlock,
  archiveUnit,
  BlockItem,
  createBlock,
  createUnit,
  getBlockById,
  getUnitById,
  listBlocks,
  listUnits,
  UnitItem,
  updateBlock,
  updateUnit,
} from './repo';

async function ensureActiveBlock(instanceId: string, blockId: string): Promise<BlockItem> {
  const block = await getBlockById(instanceId, blockId);
  if (!block) {
    throw new AppError(404, 'BLOCK_NOT_FOUND', 'Block not found');
  }

  if (block.archivedAt) {
    throw new AppError(409, 'BLOCK_ARCHIVED', 'Block is archived');
  }

  return block;
}

async function ensureActiveUnit(instanceId: string, unitId: string): Promise<UnitItem> {
  const unit = await getUnitById(instanceId, unitId);
  if (!unit) {
    throw new AppError(404, 'UNIT_NOT_FOUND', 'Unit not found');
  }

  if (unit.archivedAt) {
    throw new AppError(409, 'UNIT_ARCHIVED', 'Unit is archived');
  }

  return unit;
}

export async function listBlocksService(ctx: RequestContext, query: StructureListQuery) {
  return listBlocks(ctx.instanceId, query);
}

export async function createBlockService(ctx: RequestContext, input: CreateBlockInput): Promise<BlockItem> {
  const created = await createBlock(ctx.instanceId, input);

  await getAuditService().log(ctx, {
    action: 'BLOCK_CREATED',
    targetType: 'block',
    targetId: created.id,
    metadata: {
      label: created.label,
    },
  });

  return created;
}

export async function patchBlockService(
  ctx: RequestContext,
  blockId: string,
  input: PatchBlockInput,
): Promise<BlockItem> {
  const existing = await ensureActiveBlock(ctx.instanceId, blockId);
  const updated = await updateBlock(ctx.instanceId, blockId, input);
  if (!updated) {
    throw new AppError(404, 'BLOCK_NOT_FOUND', 'Block not found');
  }

  await getAuditService().log(ctx, {
    action: 'BLOCK_UPDATED',
    targetType: 'block',
    targetId: updated.id,
    metadata: {
      previousLabel: existing.label,
      nextLabel: updated.label,
      updatedFields: Object.keys(input),
    },
  });

  return updated;
}

export async function archiveBlockService(ctx: RequestContext, blockId: string): Promise<BlockItem> {
  const existing = await getBlockById(ctx.instanceId, blockId);
  if (!existing) {
    throw new AppError(404, 'BLOCK_NOT_FOUND', 'Block not found');
  }

  if (existing.archivedAt) {
    throw new AppError(409, 'BLOCK_ALREADY_ARCHIVED', 'Block already archived');
  }

  const archived = await archiveBlock(ctx.instanceId, blockId);
  if (!archived) {
    throw new AppError(404, 'BLOCK_NOT_FOUND', 'Block not found');
  }

  await getAuditService().log(ctx, {
    action: 'BLOCK_ARCHIVED',
    targetType: 'block',
    targetId: archived.id,
    metadata: {
      label: archived.label,
      archivedAt: archived.archivedAt,
    },
  });

  return archived;
}

export async function listUnitsService(ctx: RequestContext, query: StructureListQuery) {
  return listUnits(ctx.instanceId, query);
}

export async function createUnitService(ctx: RequestContext, input: CreateUnitInput): Promise<UnitItem> {
  if (input.blockId) {
    await ensureActiveBlock(ctx.instanceId, input.blockId);
  }

  const created = await createUnit(ctx.instanceId, input);

  await getAuditService().log(ctx, {
    action: 'UNIT_CREATED',
    targetType: 'unit',
    targetId: created.id,
    metadata: {
      label: created.label,
      blockId: created.blockId,
    },
  });

  return created;
}

export async function patchUnitService(
  ctx: RequestContext,
  unitId: string,
  input: PatchUnitInput,
): Promise<UnitItem> {
  const existing = await ensureActiveUnit(ctx.instanceId, unitId);

  if (input.blockId) {
    await ensureActiveBlock(ctx.instanceId, input.blockId);
  }

  const updated = await updateUnit(ctx.instanceId, unitId, input);
  if (!updated) {
    throw new AppError(404, 'UNIT_NOT_FOUND', 'Unit not found');
  }

  await getAuditService().log(ctx, {
    action: 'UNIT_UPDATED',
    targetType: 'unit',
    targetId: updated.id,
    metadata: {
      previousLabel: existing.label,
      nextLabel: updated.label,
      previousBlockId: existing.blockId,
      nextBlockId: updated.blockId,
      updatedFields: Object.keys(input),
    },
  });

  return updated;
}

export async function archiveUnitService(ctx: RequestContext, unitId: string): Promise<UnitItem> {
  const existing = await getUnitById(ctx.instanceId, unitId);
  if (!existing) {
    throw new AppError(404, 'UNIT_NOT_FOUND', 'Unit not found');
  }

  if (existing.archivedAt) {
    throw new AppError(409, 'UNIT_ALREADY_ARCHIVED', 'Unit already archived');
  }

  const archived = await archiveUnit(ctx.instanceId, unitId);
  if (!archived) {
    throw new AppError(404, 'UNIT_NOT_FOUND', 'Unit not found');
  }

  await getAuditService().log(ctx, {
    action: 'UNIT_ARCHIVED',
    targetType: 'unit',
    targetId: archived.id,
    metadata: {
      label: archived.label,
      blockId: archived.blockId,
      archivedAt: archived.archivedAt,
    },
  });

  return archived;
}
