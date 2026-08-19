import { AppError } from '../../core/contract/errors';
import { RequestContext } from '../../core/contract/requestContext';
import { getAuditService } from '../../core/services/audit/audit.factory';
import { UpdateCondoProfileInput } from './dto';
import { CondoProfile, getCondoProfile, updateCondoProfile } from './repo';

export async function getCondoProfileService(ctx: RequestContext): Promise<CondoProfile> {
  const profile = await getCondoProfile(ctx.instanceId);
  if (!profile) {
    throw new AppError(404, 'CONDO_PROFILE_NOT_FOUND', 'Condo profile not found');
  }

  return profile;
}

export async function updateCondoProfileService(
  ctx: RequestContext,
  input: UpdateCondoProfileInput,
): Promise<CondoProfile> {
  const updated = await updateCondoProfile(ctx.instanceId, input);
  if (!updated) {
    throw new AppError(404, 'CONDO_PROFILE_NOT_FOUND', 'Condo profile not found');
  }

  await getAuditService().log(ctx, {
    action: 'CONDO_PROFILE_UPDATED',
    targetType: 'condo_profile',
    targetId: updated.instanceId,
    metadata: {
      updatedFields: Object.keys(input),
    },
  });

  return updated;
}
