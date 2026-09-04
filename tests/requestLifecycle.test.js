import test from 'node:test';
import assert from 'node:assert/strict';

import { abortableDelay, createRequestLifecycle } from '../src/core/requestLifecycle.js';

function createPort() {
  const listeners = new Set();
  const messages = [];
  return {
    messages,
    onDisconnect: {
      addListener: (listener) => listeners.add(listener),
      removeListener: (listener) => listeners.delete(listener)
    },
    postMessage: (message) => messages.push(message),
    disconnect: () => listeners.forEach((listener) => listener())
  };
}

test('lifecycle emits one terminal message and preserves request identity', () => {
  const port = createPort();
  const lifecycle = createRequestLifecycle(port, 'request-1');
  assert.equal(lifecycle.post({ chunk: 'hello' }), true);
  assert.equal(lifecycle.complete(), true);
  assert.equal(lifecycle.complete(), false);
  assert.deepEqual(port.messages, [
    { requestId: 'request-1', chunk: 'hello' },
    { requestId: 'request-1', done: true }
  ]);
});

test('port disconnect aborts request and suppresses later writes', () => {
  const port = createPort();
  const lifecycle = createRequestLifecycle(port, 'request-2');
  port.disconnect();
  assert.equal(lifecycle.signal.aborted, true);
  assert.equal(lifecycle.post({ chunk: 'late' }), false);
  assert.deepEqual(port.messages, []);
});

test('abortable retry delays terminate immediately on cancellation', async () => {
  const controller = new AbortController();
  const pending = abortableDelay(10_000, controller.signal);
  controller.abort();
  await assert.rejects(pending, /cancelled/i);
});

