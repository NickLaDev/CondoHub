import axios from 'axios';

interface ErrorPayload {
  message?: unknown;
  code?: unknown;
}

function stringifyPayload(value: unknown) {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (value && typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return null;
    }
  }

  return null;
}

export function getHttpStatus(error: unknown) {
  if (axios.isAxiosError(error)) {
    return error.response?.status;
  }

  return undefined;
}

export function getErrorCode(error: unknown) {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as ErrorPayload | undefined;
    return typeof payload?.code === 'string' ? payload.code : undefined;
  }

  return undefined;
}

export function getErrorMessage(error: unknown, fallback = 'Não foi possível concluir a ação.') {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as ErrorPayload | undefined;
    const message = stringifyPayload(payload?.message);

    if (message) {
      return message;
    }

    if (error.message) {
      return error.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export function isForbiddenError(error: unknown) {
  return getHttpStatus(error) === 403;
}
