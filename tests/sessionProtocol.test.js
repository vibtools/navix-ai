import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createRequestId,
  createSessionId,
  normalizeUiHistory,
  toGeminiHistory,
  toProviderMessages,
  validateChatRequest
} from '../src/core/sessionProtocol.js';

test('session and request IDs have distinct stable prefixes', () => {
  const cryptoObject = { randomUUID: () => '1234' };
  assert.equal(createSessionId(cryptoObject), 'session_1234');
  assert.equal(createRequestId(cryptoObject), 'request_1234');
});

test('history normalization rejects malformed entries without mutating input', () => {
  const input = [
    { role: 'user', text: 'first' },
    { role: 'assistant', text: 'second' },
    { role: 'system', text: 'ignored' },
    { role: 'user', text: '' }
  ];

  assert.deepEqual(normalizeUiHistory(input), [
    { role: 'user', text: 'first' },
    { role: 'assistant', text: 'second' }
  ]);
  const gemini = toGeminiHistory(input);
  gemini[0].parts[0].text = 'changed';
  assert.equal(input[0].text, 'first');
  assert.deepEqual(toProviderMessages(input), [
    { role: 'user', content: 'first' },
    { role: 'assistant', content: 'second' }
  ]);
});

test('validated requests receive request-local copied history', () => {
  const source = { message: ' hello ', sessionId: ' session-1 ', chatHistory: [{ role: 'user', text: 'old' }] };
  const request = validateChatRequest(source);
  assert.equal(request.message, 'hello');
  assert.equal(request.sessionId, 'session-1');
  assert.match(request.requestId, /^request_/);
  request.chatHistory[0].text = 'changed';
  assert.equal(source.chatHistory[0].text, 'old');
});

test('empty chat requests fail validation', () => {
  assert.throws(() => validateChatRequest({ message: '   ' }), /non-empty chat message/);
});

