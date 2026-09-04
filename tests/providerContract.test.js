import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeProviderAttempt,
  normalizeProviderAttempts,
  publicProviderAttempt
} from '../src/core/providerContract.js';

test('provider attempts retain only the selected provider credential', () => {
  const request = {
    model: 'openai',
    openAiApiKey: 'openai-secret',
    openAiModel: 'gpt-test',
    geminiApiKey: 'gemini-secret',
    hfApiKey: 'hf-secret'
  };
  assert.deepEqual(normalizeProviderAttempts(request), [{
    provider: 'openai',
    model: 'gpt-test',
    apiKey: 'openai-secret'
  }]);
});

test('new provider attempt format supports isolated fallback configurations', () => {
  const attempts = normalizeProviderAttempts({
    providerAttempts: [
      { provider: 'gemini', modelId: 'gemini-test', apiKey: 'g-key' },
      { provider: 'ollama', modelId: 'local-test', baseUrl: 'http://localhost:11434/' }
    ]
  });
  assert.deepEqual(attempts, [
    { provider: 'gemini', model: 'gemini-test', apiKey: 'g-key' },
    { provider: 'ollama', model: 'local-test', baseUrl: 'http://localhost:11434' }
  ]);
});

test('public provider metadata never includes API credentials', () => {
  const attempt = normalizeProviderAttempt({ provider: 'huggingface', modelId: 'model-a', apiKey: 'secret' });
  assert.deepEqual(publicProviderAttempt(attempt), { provider: 'huggingface', model: 'model-a' });
});
