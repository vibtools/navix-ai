import { AppError, ErrorCode } from './errorContract.js';
import { throwIfAborted } from './requestLifecycle.js';

function separatorIndex(buffer) {
  const lf = buffer.indexOf('\n\n');
  const crlf = buffer.indexOf('\r\n\r\n');
  if (lf === -1) return crlf === -1 ? null : { index: crlf, length: 4 };
  if (crlf === -1 || lf < crlf) return { index: lf, length: 2 };
  return { index: crlf, length: 4 };
}

function eventData(block) {
  const values = block.split(/\r?\n/).flatMap((line) => {
    if (!line || line.startsWith(':')) return [];
    if (!line.startsWith('data:')) return [];
    return [line.slice(5).replace(/^ /, '')];
  });
  return values.length ? values.join('\n') : null;
}

export function createSseParser(onEvent) {
  let buffer = '';

  const dispatch = (block) => {
    const data = eventData(block);
    if (data !== null) onEvent(data);
  };

  return {
    push(text) {
      buffer += text;
      let separator = separatorIndex(buffer);
      while (separator) {
        dispatch(buffer.slice(0, separator.index));
        buffer = buffer.slice(separator.index + separator.length);
        separator = separatorIndex(buffer);
      }
    },
    finish() {
      if (buffer.trim()) dispatch(buffer);
      buffer = '';
    }
  };
}

export async function consumeSseJson(body, onJson, signal) {
  if (!body?.getReader) {
    throw new AppError(ErrorCode.STREAM_PROTOCOL_ERROR, 'The provider response stream is unavailable.');
  }

  const reader = body.getReader();
  const decoder = new TextDecoder('utf-8');
  let doneMarker = false;
  const parser = createSseParser((data) => {
    if (data === '[DONE]') {
      doneMarker = true;
      return;
    }
    try {
      onJson(JSON.parse(data));
    } catch (cause) {
      throw new AppError(ErrorCode.STREAM_PROTOCOL_ERROR, 'The provider returned a malformed stream event.', { cause });
    }
  });

  try {
    while (!doneMarker) {
      throwIfAborted(signal);
      const { done, value } = await reader.read();
      if (done) break;
      parser.push(decoder.decode(value, { stream: true }));
    }
    parser.push(decoder.decode());
    parser.finish();
  } finally {
    if (doneMarker) await reader.cancel().catch(() => {});
  }
}
