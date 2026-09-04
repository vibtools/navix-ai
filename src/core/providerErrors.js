import { AppError, ErrorCode, isAbortError } from './errorContract.js';

const SAFE_MESSAGES = Object.freeze({
  [ErrorCode.PROVIDER_AUTH_FAILED]: 'Provider authentication failed. Check the saved credential.',
  [ErrorCode.PROVIDER_RATE_LIMITED]: 'The provider rate limit was reached. Try again later.',
  [ErrorCode.PROVIDER_MODEL_UNSUPPORTED]: 'The selected model is unavailable or does not support this request.',
  [ErrorCode.PROVIDER_CAPABILITY_UNSUPPORTED]: 'The selected provider or model does not support a required capability.',
  [ErrorCode.PROVIDER_UNAVAILABLE]: 'The provider is unavailable or could not be reached.',
  [ErrorCode.PROVIDER_RESPONSE_INVALID]: 'The provider returned an invalid response.'
});

export function retryAfterMilliseconds(value, now = Date.now()) {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1000, 60000);
  const date = Date.parse(value);
  if (Number.isNaN(date)) return null;
  return Math.max(0, Math.min(date - now, 60000));
}

export function providerHttpError(provider, status, body = '', retryAfter = null) {
  const normalizedBody = typeof body === 'string' ? body.toLowerCase() : '';
  let code = ErrorCode.PROVIDER_UNAVAILABLE;
  let retryable = status >= 500;

  if (status === 401 || status === 403 || normalizedBody.includes('invalid api key') || normalizedBody.includes('unauthorized')) {
    code = ErrorCode.PROVIDER_AUTH_FAILED;
    retryable = false;
  } else if (status === 429) {
    code = ErrorCode.PROVIDER_RATE_LIMITED;
    retryable = true;
  } else if (status === 404 || normalizedBody.includes('model') || normalizedBody.includes('not support')) {
    code = normalizedBody.includes('tool') || normalizedBody.includes('image')
      ? ErrorCode.PROVIDER_CAPABILITY_UNSUPPORTED
      : ErrorCode.PROVIDER_MODEL_UNSUPPORTED;
    retryable = false;
  } else if (status === 408) {
    retryable = true;
  }

  const error = new AppError(code, SAFE_MESSAGES[code], { source: provider, status, retryable });
  error.retryAfterMs = retryAfterMilliseconds(retryAfter);
  return error;
}

export function normalizeProviderFailure(provider, error) {
  if (error instanceof AppError || isAbortError(error)) return error;
  return new AppError(ErrorCode.PROVIDER_UNAVAILABLE, SAFE_MESSAGES[ErrorCode.PROVIDER_UNAVAILABLE], {
    cause: error,
    source: provider,
    retryable: true
  });
}

export function canRetryProviderError(error) {
  return Boolean(error?.retryable) && !isAbortError(error);
}

export function canFallbackProviderError(error, emittedOutput) {
  return !emittedOutput && canRetryProviderError(error);
}
