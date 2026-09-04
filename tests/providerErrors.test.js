import test from 'node:test';
import assert from 'node:assert/strict';
import { providerHttpError, retryAfterMilliseconds } from '../src/core/providerErrors.js';

test('provider HTTP failures map to stable safe error families', () => {
  assert.equal(providerHttpError('openai', 401, 'secret details').code, 'PROVIDER_AUTH_FAILED');
  assert.equal(providerHttpError('openai', 429, '').code, 'PROVIDER_RATE_LIMITED');
  assert.equal(providerHttpError('openai', 404, 'model missing').code, 'PROVIDER_MODEL_UNSUPPORTED');
  assert.equal(providerHttpError('openai', 400, 'tools not supported').code, 'PROVIDER_CAPABILITY_UNSUPPORTED');
  assert.equal(providerHttpError('openai', 503, '').code, 'PROVIDER_UNAVAILABLE');
});

test('Retry-After parsing is bounded to one minute', () => {
  assert.equal(retryAfterMilliseconds('2'), 2000);
  assert.equal(retryAfterMilliseconds('999'), 60000);
  assert.equal(retryAfterMilliseconds('invalid'), null);
});

test('provider errors do not expose upstream response bodies', () => {
  const error = providerHttpError('openai', 401, 'api key sk-sensitive-value is invalid');
  assert.doesNotMatch(error.message, /sk-sensitive-value/);
});
