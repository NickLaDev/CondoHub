export type RequestContext = {
  instanceId: string;
  actor?: {
    userId: string;
    roles: string[];
    unitId?: string;
  };
  requestMeta?: {
    ip?: string;
    userAgent?: string;
    requestId?: string;
  };
};
