import test from 'node:test';
import assert from 'node:assert/strict';
import { generateImage, IMAGE_MODEL_REGISTRY } from '../src/capabilities/imageGeneration.js';
import { ErrorCode } from '../src/core/errorContract.js';

function jsonResponse(body, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

test('Gemini image models use the interactions contract and extract image bytes', async () => {
  let request;
  const result = await generateImage({ imageModel: 'Nano Banana 2', prompt: 'A blue circle', attempt: { provider: 'gemini', apiKey: 'key' } }, {
    fetchImpl: async (url, options) => {
      request = { url, options };
      return jsonResponse({ outputs: [{ image: { data: 'a'.repeat(128), mimeType: 'image/png' } }] });
    }
  });
  assert.equal(request.url, 'https://generativelanguage.googleapis.com/v1beta/interactions');
  assert.equal(JSON.parse(request.options.body).model, IMAGE_MODEL_REGISTRY['Nano Banana 2'].model);
  assert.equal(result.mimeType, 'image/png');
});

test('OpenAI image quality maps to gpt-image-2 and provider credentials never cross', async () => {
  let body;
  await generateImage({ imageModel: 'GPT-image-2 (High)', prompt: 'A safe icon', attempt: { provider: 'openai', apiKey: 'key' } }, {
    fetchImpl: async (_url, options) => {
      body = JSON.parse(options.body);
      return jsonResponse({ data: [{ b64_json: 'b'.repeat(128) }] });
    }
  });
  assert.deepEqual(body, { model: 'gpt-image-2', prompt: 'A safe icon', quality: 'high', size: '1024x1024', output_format: 'png' });
  await assert.rejects(
    generateImage({ imageModel: 'GPT-image-2 (Low)', prompt: 'x', attempt: { provider: 'gemini', apiKey: 'key' } }, { fetchImpl: async () => jsonResponse({}) }),
    (error) => error.code === ErrorCode.PROVIDER_CAPABILITY_UNSUPPORTED
  );
});

test('image service maps upstream auth failures without exposing response bodies', async () => {
  await assert.rejects(
    generateImage({ imageModel: 'Nano Banana', prompt: 'x', attempt: { provider: 'gemini', apiKey: 'bad' } }, { fetchImpl: async () => jsonResponse({ error: { message: 'raw secret details' } }, 403) }),
    (error) => error.code === ErrorCode.PROVIDER_AUTH_FAILED && !error.message.includes('raw secret details')
  );
});
