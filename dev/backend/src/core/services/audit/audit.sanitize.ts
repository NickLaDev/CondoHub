const SENSITIVE_KEY_PATTERN =
  /(token|refresh|password|secret|authorization|cookie|api[-_]?key|service[-_]?role)/i;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return Object.getPrototypeOf(value) === Object.prototype;
}

function sanitizeNode(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeNode);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (!isPlainObject(value)) {
    return value;
  }

  const sanitized: Record<string, unknown> = {};

  for (const [key, current] of Object.entries(value)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      continue;
    }
    sanitized[key] = sanitizeNode(current);
  }

  return sanitized;
}

export function sanitizeAuditMetadata(metadata?: Record<string, unknown>): Record<string, unknown> {
  if (!metadata) {
    return {};
  }

  const sanitized = sanitizeNode(metadata);
  if (!isPlainObject(sanitized)) {
    return {};
  }

  return sanitized;
}
