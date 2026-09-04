import test from 'node:test';
import assert from 'node:assert/strict';
import { openAiCompatibleGenerate, openAiCompatibleProbe } from '../src/providers/openAiCompatible.js';
import { huggingFaceAdapter } from '../src/providers/huggingFaceAdapter.js';
import { ollamaAdapter } from '../src/providers/ollamaAdapter.js';
import { geminiAdapter } from '../src/providers/geminiAdapter.js';

function streamResponse(text, chunkSize = 1) {
  const encoder = new TextEncoder();
  const chunks = [];
  for (let index = 0; index < text.length; index += chunkSize) chunks.push(text.slice(index, index + chunkSize));
  return new Response(new ReadableStream({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
      controller.close();
    }
  }), { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
}

const baseContext = {
  messages: [{ role: 'user', content: 'hello', requestInput: true }],
  prompt: { systemInstruction: 'system', screenshotDataUrl: '' },
  tools: [],
  signal: new AbortController().signal
};

test('OpenAI-compatible adapter preserves byte-fragmented text and tool calls', async () => {
  const events = [
    'data: {"choices":[{"delta":{"content":"Hi "}}]}\n\n',
    'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_1","function":{"name":"read_page","arguments":"{"}}]}}]}\n\n',
    'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"}"}}]}}]}\n\n',
    'data: [DONE]\n\n'
  ].join('');
  const chunks = [];
  const result = await openAiCompatibleGenerate({
    ...baseContext,
    provider: 'openai',
    url: 'https://example.test/chat',
    apiKey: 'secret',
    model: 'model',
    onChunk: (chunk) => chunks.push(chunk),
    fetchImpl: async () => streamResponse(events)
  });
  assert.equal(chunks.join(''), 'Hi ');
  assert.deepEqual(result.toolCalls, [{ id: 'call_1', name: 'read_page', args: {} }]);
});

test('Hugging Face adapter uses the current router endpoint and streams output', async () => {
  let capturedUrl = '';
  const chunks = [];
  await huggingFaceAdapter.generate({
    ...baseContext,
    attempt: { provider: 'huggingface', model: 'model', apiKey: 'hf-secret' },
    onChunk: (chunk) => chunks.push(chunk),
    fetchImpl: async (url) => {
      capturedUrl = url;
      return streamResponse('data: {"choices":[{"delta":{"content":"ok"}}]}\n\ndata: [DONE]\n\n', 7);
    }
  });
  assert.equal(capturedUrl, 'https://router.huggingface.co/v1/chat/completions');
  assert.equal(chunks.join(''), 'ok');
});

test('Ollama falls back from failed OpenAI compatibility to native chat response', async () => {
  const urls = [];
  const chunks = [];
  const result = await ollamaAdapter.generate({
    ...baseContext,
    attempt: { provider: 'ollama', model: 'llama3', baseUrl: 'http://localhost:11434' },
    request: {},
    onChunk: (chunk) => chunks.push(chunk),
    fetchImpl: async (url) => {
      urls.push(url);
      if (url.endsWith('/v1/chat/completions')) return new Response('not found', { status: 404 });
      return Response.json({ message: { role: 'assistant', content: 'native ok' }, done: true });
    }
  });
  assert.deepEqual(urls, [
    'http://localhost:11434/v1/chat/completions',
    'http://localhost:11434/api/chat'
  ]);
  assert.equal(result.text, 'native ok');
  assert.equal(chunks.join(''), 'native ok');
});

test('provider probe rejects an unavailable selected model', async () => {
  await assert.rejects(openAiCompatibleProbe({
    provider: 'openai',
    url: 'https://example.test/models',
    apiKey: 'secret',
    model: 'missing-model',
    signal: new AbortController().signal,
    fetchImpl: async () => Response.json({ data: [{ id: 'available-model' }] })
  }), (error) => error.code === 'PROVIDER_MODEL_UNSUPPORTED');
});

test('Gemini adapter preserves parallel identical tool calls from distinct response parts', async () => {
  async function* stream() {
    yield {
      candidates: [{ content: { parts: [
        { functionCall: { name: 'read_page', args: {} } },
        { functionCall: { name: 'read_page', args: {} } }
      ] } }],
      functionCalls: [
        { name: 'read_page', args: {} },
        { name: 'read_page', args: {} }
      ]
    };
  }
  const result = await geminiAdapter.generate({
    ...baseContext,
    attempt: { provider: 'gemini', model: 'gemini-test', apiKey: 'secret' },
    onChunk: () => {},
    createGeminiClient: () => ({ models: { generateContentStream: async () => stream() } })
  });
  assert.equal(result.toolCalls.length, 2);
  assert.equal(result.toolCalls[0].name, 'read_page');
  assert.equal(result.providerState.geminiParts.length, 2);
});
