export interface ErrorResponse {
  error: true;
  code: string;
  message: string;
  details: Record<string, unknown>;
}

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details: Record<string, unknown>;

  constructor(statusCode: number, code: string, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  toJSON(): ErrorResponse {
    return {
      error: true,
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

export const Errors = {
  tenantRequired: () => new AppError(400, 'TENANT_REQUIRED', 'Instance ID is required'),
  tenantNotFound: () => new AppError(404, 'TENANT_NOT_FOUND', 'Instance not found'),
  instanceSuspended: () => new AppError(403, 'INST_SUSPENDED', 'This instance is suspended'),
  authRequired: () => new AppError(401, 'AUTH_REQUIRED', 'Authentication is required'),
  authInvalid: () => new AppError(401, 'AUTH_INVALID', 'Invalid or expired token'),
  permissionDenied: () => new AppError(403, 'PERMISSION_DENIED', 'Permission denied'),
  forbidden: () => new AppError(403, 'FORBIDDEN', 'Insufficient permissions'),
  notImplemented: () => new AppError(501, 'NOT_IMPLEMENTED', 'This endpoint is not yet implemented'),
  validationError: (details: Record<string, unknown>) =>
    new AppError(400, 'VALIDATION_ERROR', 'Validation failed', details),
  dbUnavailable: () => new AppError(503, 'DB_UNAVAILABLE', 'Database not reachable'),
  dbError: (message = 'Database operation failed', details: Record<string, unknown> = {}) =>
    new AppError(500, 'DB_ERROR', message, details),
  internalError: (message = 'Internal server error') =>
    new AppError(500, 'INTERNAL_ERROR', message),
};
