import { AppError, ErrorCode } from './errorContract.js';

export const CHAT_REQUEST = 'AI_CHAT_REQUEST';
export const CLEAR_HISTORY = 'CLEAR_HISTORY';
export const PROVIDER_PROBE = 'PROVIDER_PROBE';

function createId(prefix, cryptoObject = globalThis.crypto, now = Date.now) {
  if (typeof cryptoObject?.randomUUID === 'function') {
    return `${prefix}_${cryptoObject.randomUUID()}`;
  }
  return `${prefix}_${now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createSessionId(cryptoObject, now) {
  return createId('session', cryptoObject, now);
}

export function createRequestId(cryptoObject, now) {
  return createId('request', cryptoObject, now);
}

export function normalizeSessionId(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function normalizeUiHistory(history) {
  if (!Array.isArray(history)) return [];

  return history.flatMap((message) => {
    const role = message?.role === 'assistant' ? 'assistant' : message?.role === 'user' ? 'user' : null;
    const text = typeof message?.text === 'string' ? message.text : '';
    return role && text.trim() ? [{ role, text }] : [];
  });
}

export function toGeminiHistory(history) {
  return normalizeUiHistory(history).map(({ role, text }) => ({
    role: role === 'assistant' ? 'model' : 'user',
    parts: [{ text }]
  }));
}

export function toProviderMessages(history) {
  return normalizeUiHistory(history).map(({ role, text }) => ({ role, content: text }));
}

export function validateChatRequest(request) {
  if (!request || typeof request.message !== 'string' || !request.message.trim()) {
    throw new AppError(ErrorCode.INVALID_REQUEST, 'A non-empty chat message is required.');
  }

  return {
    ...request,
    message: request.message.trim(),
    requestId: typeof request.requestId === 'string' && request.requestId.trim()
      ? request.requestId.trim()
      : createRequestId(),
    sessionId: normalizeSessionId(request.sessionId),
    chatHistory: normalizeUiHistory(request.chatHistory)
  };
}
