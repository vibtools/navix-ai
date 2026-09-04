import test from 'node:test';
import assert from 'node:assert/strict';
import { AppError, ErrorCode } from '../src/core/errorContract.js';
import { probeProvider, runProviderRequest } from '../src/providers/providerRunner.js';

const request = {
  message: 'hello',
  chatHistory: [{ role: 'user', text: 'history' }],
  providerAttempts: [{ provider: 'openai', modelId: 'primary', apiKey: 'one' }]
};

test('runner falls back only after a retryable zero-output failure', async () => {
  let primaryCalls = 0;
  let fallbackAttempt;
  const retryable = new AppError(ErrorCode.PROVIDER_UNAVAILABLE, 'unavailable', { retryable: true });
  retryable.retryAfterMs = 0;
  const registry = {
    openai: {
      id: 'openai', capabilities: { tools: false, screenshot: false },
      async generate() { primaryCalls += 1; throw retryable; }
    },
    gemini: {
      id: 'gemini', capabilities: { tools: false, screenshot: false },
      async generate(context) {
        fallbackAttempt = context.attempt;
        context.onChunk('fallback ok');
        return { text: 'fallback ok', toolCalls: [] };
      }
    }
  };
  const chunks = [];
  await runProviderRequest({
    ...request,
    providerAttempts: [
      ...request.providerAttempts,
      { provider: 'gemini', modelId: 'fallback', apiKey: 'two' }
    ]
  }, { registry, signal: new AbortController().signal, onChunk: (chunk) => chunks.push(chunk) });
  assert.equal(primaryCalls, 3);
  assert.deepEqual(fallbackAttempt, { provider: 'gemini', model: 'fallback', apiKey: 'two' });
  assert.equal(chunks.join(''), 'fallback ok');
});

test('runner never retries or falls back after partial output', async () => {
  let fallbackCalled = false;
  const registry = {
    openai: {
      id: 'openai', capabilities: { tools: false, screenshot: false },
      async generate(context) {
        context.onChunk('partial');
        throw new AppError(ErrorCode.PROVIDER_UNAVAILABLE, 'failed', { retryable: true });
      }
    },
    gemini: {
      id: 'gemini', capabilities: { tools: false, screenshot: false },
      async generate() { fallbackCalled = true; return { text: 'bad', toolCalls: [] }; }
    }
  };
  await assert.rejects(runProviderRequest({
    ...request,
    providerAttempts: [
      ...request.providerAttempts,
      { provider: 'gemini', modelId: 'fallback', apiKey: 'two' }
    ]
  }, { registry, signal: new AbortController().signal, onChunk: () => {} }));
  assert.equal(fallbackCalled, false);
});

test('shared runner executes validated provider tool calls and returns results', async () => {
  const seenMessages = [];
  let generation = 0;
  const registry = {
    openai: {
      id: 'openai', capabilities: { tools: true, screenshot: true },
      async generate(context) {
        seenMessages.push(structuredClone(context.messages));
        generation += 1;
        if (generation === 1) {
          return { text: '', toolCalls: [{ id: 'call', name: 'read_page', args: {} }] };
        }
        context.onChunk('complete');
        return { text: 'complete', toolCalls: [] };
      }
    }
  };
  const toolCalls = [];
  const output = [];
  await runProviderRequest(request, {
    registry,
    signal: new AbortController().signal,
    onChunk: (chunk) => output.push(chunk),
    toolExecutor: async (name, args) => {
      toolCalls.push({ name, args });
      return { success: true, text: 'page' };
    }
  });
  assert.deepEqual(toolCalls, [{ name: 'read_page', args: {} }]);
  assert.equal(seenMessages[1].at(-1).role, 'tool');
  assert.equal(output.join(''), 'complete');
});

test('unknown tools are rejected before browser execution', async () => {
  let executed = false;
  const registry = {
    openai: {
      id: 'openai', capabilities: { tools: true, screenshot: false },
      async generate() { return { text: '', toolCalls: [{ id: 'bad', name: 'unknown', args: {} }] }; }
    }
  };
  await assert.rejects(runProviderRequest(request, {
    registry,
    signal: new AbortController().signal,
    toolExecutor: async () => { executed = true; }
  }), (error) => error.code === 'TOOL_CALL_INVALID');
  assert.equal(executed, false);
});

test('provider timeout is normalized and can safely fall back before output', async () => {
  const registry = {
    openai: {
      id: 'openai', capabilities: { tools: false, screenshot: false },
      async generate(context) {
        await new Promise((resolve, reject) => {
          context.signal.addEventListener('abort', () => reject(context.signal.reason), { once: true });
        });
      }
    },
    gemini: {
      id: 'gemini', capabilities: { tools: false, screenshot: false },
      async generate(context) {
        context.onChunk('timeout fallback');
        return { text: 'timeout fallback', toolCalls: [] };
      }
    }
  };
  const chunks = [];
  await runProviderRequest({
    ...request,
    providerAttempts: [
      ...request.providerAttempts,
      { provider: 'gemini', modelId: 'fallback', apiKey: 'two' }
    ]
  }, {
    registry,
    timeoutMs: 2,
    signal: new AbortController().signal,
    onChunk: (chunk) => chunks.push(chunk)
  });
  assert.equal(chunks.join(''), 'timeout fallback');
});

test('provider diagnostics have an independent normalized timeout', async () => {
  const registry = {
    openai: {
      id: 'openai', capabilities: { tools: false, screenshot: false },
      async probe(context) {
        await new Promise((resolve, reject) => {
          context.signal.addEventListener('abort', () => reject(context.signal.reason), { once: true });
        });
      }
    }
  };
  await assert.rejects(probeProvider(
    { provider: 'openai', modelId: 'model', apiKey: 'secret' },
    { registry, timeoutMs: 2, signal: new AbortController().signal }
  ), (error) => error.code === 'PROVIDER_UNAVAILABLE' && /timed out/i.test(error.message));
});

test('authentication and model errors never trigger automatic fallback', async () => {
  for (const code of [ErrorCode.PROVIDER_AUTH_FAILED, ErrorCode.PROVIDER_MODEL_UNSUPPORTED]) {
    let fallbackCalled = false;
    const registry = {
      openai: {
        id: 'openai', capabilities: { tools: false, screenshot: false },
        async generate() { throw new AppError(code, 'configuration error'); }
      },
      gemini: {
        id: 'gemini', capabilities: { tools: false, screenshot: false },
        async generate() { fallbackCalled = true; return { text: 'bad', toolCalls: [] }; }
      }
    };
    await assert.rejects(runProviderRequest({
      ...request,
      providerAttempts: [
        ...request.providerAttempts,
        { provider: 'gemini', modelId: 'fallback', apiKey: 'two' }
      ]
    }, { registry, signal: new AbortController().signal }));
    assert.equal(fallbackCalled, false);
  }
});

test('empty provider responses fail instead of reporting false success', async () => {
  const registry = {
    openai: {
      id: 'openai', capabilities: { tools: false, screenshot: false },
      async generate() { return { text: '', toolCalls: [] }; }
    }
  };
  await assert.rejects(
    runProviderRequest(request, { registry, signal: new AbortController().signal }),
    (error) => error.code === 'PROVIDER_RESPONSE_INVALID'
  );
});

test('unsupported screenshot capability is explicit and does not call provider', async () => {
  let called = false;
  const registry = {
    openai: {
      id: 'openai', capabilities: { tools: false, screenshot: false },
      async generate() { called = true; return { text: 'bad', toolCalls: [] }; }
    }
  };
  await assert.rejects(runProviderRequest(
    { ...request, screenshotDataUrl: 'data:image/jpeg;base64,abc' },
    { registry, signal: new AbortController().signal }
  ), (error) => error.code === 'PROVIDER_CAPABILITY_UNSUPPORTED');
  assert.equal(called, false);
});
