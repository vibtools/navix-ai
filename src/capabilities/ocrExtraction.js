import ocrWorkerUrl from 'tesseract.js/dist/worker.min.js?url';
import ocrCoreUrl from 'tesseract.js-core/tesseract-core-lstm.wasm.js?url';
import { AppError, ErrorCode } from '../core/errorContract.js';
import { limitExtractedText } from '../core/filePolicy.js';

export const OCR_TIMEOUT_MS = 45_000;
const OCR_LANGUAGE_PATH = 'https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng/4.0.0_best_int';

function createTimeoutPromise(milliseconds) {
  let timer;
  const promise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new AppError(ErrorCode.CAPABILITY_UNAVAILABLE, `OCR timed out after ${milliseconds / 1000} seconds.`)), milliseconds);
  });
  return { promise, cancel: () => clearTimeout(timer) };
}

function createAbortPromise(signal) {
  if (!signal) return null;
  if (signal.aborted) return { promise: Promise.reject(new AppError(ErrorCode.CANCELLED, 'OCR was cancelled.')), cleanup() {} };
  let listener;
  const promise = new Promise((_, reject) => {
    listener = () => reject(new AppError(ErrorCode.CANCELLED, 'OCR was cancelled.'));
    signal.addEventListener('abort', listener, { once: true });
  });
  return { promise, cleanup: () => signal.removeEventListener('abort', listener) };
}

export async function extractOcrText(dataUrl, { signal, timeoutMs = OCR_TIMEOUT_MS } = {}) {
  if (signal?.aborted) throw new AppError(ErrorCode.CANCELLED, 'OCR was cancelled.');
  const { createWorker } = await import('tesseract.js');
  let worker = null;
  let recognition;
  const timeout = createTimeoutPromise(timeoutMs);

  recognition = (async () => {
    worker = await createWorker('eng', 1, {
      workerPath: ocrWorkerUrl,
      workerBlobURL: false,
      corePath: ocrCoreUrl,
      langPath: OCR_LANGUAGE_PATH
    });
    try {
      return await worker.recognize(dataUrl);
    } finally {
      await worker.terminate().catch(() => {});
      worker = null;
    }
  })();

  const abort = createAbortPromise(signal);
  const races = [recognition, timeout.promise];
  if (abort) races.push(abort.promise);

  try {
    const { data } = await Promise.race(races);
    return limitExtractedText(data?.text || '').text;
  } finally {
    timeout.cancel();
    abort?.cleanup();
    if (worker) await worker.terminate().catch(() => {});
    // A timeout/cancellation can finish the race before worker creation completes.
    // The recognition task owns final cleanup in that case.
    void recognition.catch(() => {});
  }
}
