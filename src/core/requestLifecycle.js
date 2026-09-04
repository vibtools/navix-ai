import { AppError, ErrorCode, isAbortError, toErrorPayload } from './errorContract.js';

export function throwIfAborted(signal) {
  if (signal?.aborted) {
    throw new AppError(ErrorCode.CANCELLED, 'Request cancelled.', { cause: signal.reason });
  }
}

export function abortableDelay(milliseconds, signal) {
  throwIfAborted(signal);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, milliseconds);

    const onAbort = () => {
      clearTimeout(timer);
      reject(new AppError(ErrorCode.CANCELLED, 'Request cancelled.', { cause: signal.reason }));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export function createRequestLifecycle(port, requestId = null) {
  const controller = new AbortController();
  let disconnected = false;
  let finished = false;

  const onDisconnect = () => {
    disconnected = true;
    if (!controller.signal.aborted) {
      controller.abort(new AppError(ErrorCode.PORT_DISCONNECTED, 'Request port disconnected.'));
    }
  };

  port?.onDisconnect?.addListener?.(onDisconnect);

  const post = (message) => {
    if (disconnected || finished) return false;
    try {
      port?.postMessage?.({ requestId, ...message });
      return true;
    } catch {
      onDisconnect();
      return false;
    }
  };

  const complete = () => {
    if (finished) return false;
    const posted = post({ done: true });
    finished = true;
    port?.onDisconnect?.removeListener?.(onDisconnect);
    return posted;
  };

  const fail = (error) => {
    if (finished || isAbortError(error)) return false;
    post({ error: toErrorPayload(error) });
    return complete();
  };

  const abort = (reason = new AppError(ErrorCode.CANCELLED, 'Request cancelled.')) => {
    if (!controller.signal.aborted) controller.abort(reason);
  };

  return {
    signal: controller.signal,
    post,
    complete,
    fail,
    abort,
    isFinished: () => finished,
    isDisconnected: () => disconnected
  };
}

