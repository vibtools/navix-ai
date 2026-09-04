import test from 'node:test';
import assert from 'node:assert/strict';
import { consumeSseJson, createSseParser } from '../src/core/sseParser.js';

function streamFromStrings(chunks) {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
      controller.close();
    }
  });
}

test('SSE parser preserves records fragmented at every character boundary', () => {
  const payload = 'data: {"value":1}\n\ndata: {"value":2}\n\n';
  for (let split = 1; split < payload.length; split += 1) {
    const events = [];
    const parser = createSseParser((event) => events.push(event));
    parser.push(payload.slice(0, split));
    parser.push(payload.slice(split));
    parser.finish();
    assert.deepEqual(events, ['{"value":1}', '{"value":2}']);
  }
});

test('SSE parser supports CRLF, comments, multiline data and done markers', async () => {
  const values = [];
  const body = streamFromStrings([
    ': keepalive\r\ndata: {"text":',
    '"hello"}\r\n\r\ndata: [DONE]\r\n\r\n'
  ]);
  await consumeSseJson(body, (value) => values.push(value), new AbortController().signal);
  assert.deepEqual(values, [{ text: 'hello' }]);
});

test('malformed JSON is surfaced as STREAM_PROTOCOL_ERROR', async () => {
  const body = streamFromStrings(['data: {broken}\n\n']);
  await assert.rejects(
    consumeSseJson(body, () => {}, new AbortController().signal),
    (error) => error.code === 'STREAM_PROTOCOL_ERROR'
  );
});
