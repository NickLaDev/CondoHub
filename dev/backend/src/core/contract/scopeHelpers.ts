import { Errors } from './errors';

export function assertSameUnit(resourceUnitId: string, actorUnitId?: string): void {
  if (!actorUnitId || actorUnitId !== resourceUnitId) {
    throw Errors.forbidden();
  }
}

export function assertAssigned(resourceAssignedTo: string, actorUserId: string): void {
  if (resourceAssignedTo !== actorUserId) {
    throw Errors.forbidden();
  }
}
