export const ErrorCode = Object.freeze({
  CANCELLED: 'REQUEST_CANCELLED',
  INVALID_REQUEST: 'INVALID_REQUEST',
  PORT_DISCONNECTED: 'PORT_DISCONNECTED',
  STORAGE_DATA_INVALID: 'STORAGE_DATA_INVALID',
  STORAGE_READ_FAILED: 'STORAGE_READ_FAILED',
  STORAGE_QUOTA_EXCEEDED: 'STORAGE_QUOTA_EXCEEDED',
  STORAGE_UNAVAILABLE: 'STORAGE_UNAVAILABLE',
  STORAGE_WRITE_FAILED: 'STORAGE_WRITE_FAILED',
  UNKNOWN: 'UNKNOWN_ERROR'
});

export class AppError extends Error {
  constructor(code, message, options = {}) {
    super(message, { cause: options.cause });
    this.name = 'AppError';
    this.code = code;
    this.retryable = Boolean(options.retryable);
  }
}

export function isAbortError(error) {
  return error?.name === 'AbortError' || error?.code === ErrorCode.CANCELLED;
}

export function normalizeError(error, fallbackCode = ErrorCode.UNKNOWN) {
  if (error instanceof AppError) return error;
  if (isAbortError(error)) {
    return new AppError(ErrorCode.CANCELLED, 'Request cancelled.', { cause: error });
  }

  const message = typeof error?.message === 'string' && error.message.trim()
    ? error.message.trim()
    : 'An unexpected error occurred.';
  return new AppError(fallbackCode, message, { cause: error });
}

export function toErrorPayload(error, fallbackCode = ErrorCode.UNKNOWN) {
  const normalized = normalizeError(error, fallbackCode);
  return {
    code: normalized.code,
    message: normalized.message,
    retryable: normalized.retryable
  };
}
