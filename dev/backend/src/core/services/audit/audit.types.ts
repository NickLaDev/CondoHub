import { RequestContext } from '../../contract/requestContext';

export interface AuditEntry {
  action: string;
  targetType: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditService {
  log(ctx: RequestContext, entry: AuditEntry): Promise<void>;
}
