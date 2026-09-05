import { AppError, ErrorCode } from './errorContract.js';

export const ACTION_DECISION = 'ACTION_DECISION';
export const ACTION_CONFIRMATION = 'ACTION_CONFIRMATION';

function randomId(cryptoObject = globalThis.crypto) {
  if (typeof cryptoObject?.randomUUID === 'function') return `action_${cryptoObject.randomUUID()}`;
  return `action_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function createConfirmationBroker({ now = Date.now, ttlMs = 30_000, cryptoObject = globalThis.crypto } = {}) {
  const pending = new Map();

  const rejectRecord = (record, error) => {
    clearTimeout(record.timer);
    record.signal?.removeEventListener('abort', record.onAbort);
    record.reject(error);
  };

  return {
    request(details, emit, signal) {
      if (signal?.aborted) return Promise.reject(new AppError(ErrorCode.CANCELLED, 'Request cancelled.'));
      const confirmationId = randomId(cryptoObject);
      const expiresAt = now() + ttlMs;
      return new Promise((resolve, reject) => {
        const record = { details, expiresAt, resolve, reject, signal, timer: null, onAbort: null };
        record.onAbort = () => {
          pending.delete(confirmationId);
          rejectRecord(record, new AppError(ErrorCode.CANCELLED, 'Request cancelled.'));
        };
        record.timer = setTimeout(() => {
          pending.delete(confirmationId);
          rejectRecord(record, new AppError(ErrorCode.ACTION_CONFIRMATION_EXPIRED, 'Action approval expired.'));
        }, ttlMs);
        signal?.addEventListener('abort', record.onAbort, { once: true });
        pending.set(confirmationId, record);
        emit({ type: ACTION_CONFIRMATION, confirmation: { confirmationId, expiresAt, ...details } });
      });
    },

    decide({ confirmationId, approved, requestId, sessionId }) {
      const record = pending.get(confirmationId);
      if (!record) return false;
      pending.delete(confirmationId);
      clearTimeout(record.timer);
      record.signal?.removeEventListener('abort', record.onAbort);
      if (record.expiresAt <= now() || requestId !== record.details.requestId || sessionId !== record.details.sessionId) {
        record.reject(new AppError(ErrorCode.ACTION_CONFIRMATION_EXPIRED, 'Action approval is stale or does not match the active request.'));
        return false;
      }
      if (!approved) {
        record.reject(new AppError(ErrorCode.ACTION_DENIED, 'The user denied the proposed browser action.'));
        return true;
      }
      record.resolve({ approved: true, confirmationId });
      return true;
    },

    cancelAll() {
      for (const [id, record] of pending) {
        pending.delete(id);
        rejectRecord(record, new AppError(ErrorCode.CANCELLED, 'Request cancelled.'));
      }
    },

    get size() {
      return pending.size;
    }
  };
}
