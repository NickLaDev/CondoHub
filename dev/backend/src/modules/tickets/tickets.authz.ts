import { AppError, Errors } from '../../core/contract/errors';
import { ROLES } from '../../core/contract/roles';
import { assertAssigned } from '../../core/contract/scopeHelpers';

type TicketStatusActor = {
  userId: string;
  roles: string[];
};

export function assertCanChangeTicketStatus(
  actor: TicketStatusActor,
  assignedToUserId: string | null,
): void {
  if (actor.roles.includes(ROLES.SINDICO_ADMIN)) {
    return;
  }

  if (!actor.roles.includes(ROLES.FUNC_MANUTENCAO)) {
    throw Errors.permissionDenied();
  }

  try {
    assertAssigned(assignedToUserId ?? '', actor.userId);
  } catch (error) {
    if (error instanceof AppError && error.code === 'FORBIDDEN') {
      throw Errors.permissionDenied();
    }

    throw error;
  }
}
