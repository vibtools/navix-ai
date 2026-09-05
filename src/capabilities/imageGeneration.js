import { AppError, ErrorCode } from '../core/errorContract.js';

export const IMAGE_GENERATE_REQUEST = 'IMAGE_GENERATE_REQUEST';
export const IMAGE_CANCEL_REQUEST = 'IMAGE_CANCEL_REQUEST';

export const IMAGE_MODEL_REGISTRY = Object.freeze({
  'Nano Banana': { provider: 'gemini', model: 'gemini-2.5-flash-image' },
  'Nano Banana 2': { provider: 'gemini', model: 'gemini-3.1-flash-image' },
  'Nano Banana Pro': { provider: 'gemini', model: 'gemini-3-pro-image' },
  'GPT-image-2 (Low)': { provider: 'openai', model: 'gpt-image-2', quality: 'low' },
  'GPT-image-2 (Medium)': { provider: 'openai', model: 'gpt-image-2', quality: 'medium' },
  'GPT-image-2 (High)': { provider: 'openai', model: 'gpt-image-2', quality: 'high' }
});

function requirePrompt(value) {
  const prompt = typeof value === 'string' ? value.trim() : '';
  if (!prompt || prompt.length > 16_000) throw new AppError(ErrorCode.INVALID_REQUEST, 'Image prompt is empty or exceeds 16,000 characters.');
  return prompt;
}

async function safeJson(response) {
  return response.json().catch(() => ({}));
}

function findImagePayload(value, seen = new Set()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return null;
  seen.add(value);
  const directData = value.data || value.b64_json || value.bytesBase64Encoded;
  const mimeType = value.mime_type || value.mimeType || value.output_format;
  if (typeof directData === 'string' && directData.length > 100 && (!mimeType || /^image\//.test(mimeType) || ['png', 'jpeg', 'webp'].includes(mimeType))) {
    return { data: directData, mimeType: mimeType?.startsWith('image/') ? mimeType : `image/${mimeType || 'png'}` };
  }
  for (const child of Array.isArray(value) ? value : Object.values(value)) {
    const found = findImagePayload(child, seen);
    if (found) return found;
  }
  return null;
}

async function generateGemini({ prompt, apiKey, model, signal, fetchImpl }) {
  if (!apiKey) throw new AppError(ErrorCode.PROVIDER_AUTH_FAILED, 'A Gemini API key is required for image generation.');
  const response = await fetchImpl('https://generativelanguage.googleapis.com/v1beta/interactions', {
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({ model, input: [{ type: 'text', text: prompt }], response_format: { type: 'image', mime_type: 'image/png' } })
  });
  const body = await safeJson(response);
  if (!response.ok) throw new AppError(response.status === 401 || response.status === 403 ? ErrorCode.PROVIDER_AUTH_FAILED : ErrorCode.PROVIDER_UNAVAILABLE, `Gemini image generation failed (${response.status}).`, { status: response.status });
  const image = findImagePayload(body);
  if (!image) throw new AppError(ErrorCode.PROVIDER_RESPONSE_INVALID, 'Gemini did not return a generated image.');
  return image;
}

async function generateOpenAi({ prompt, apiKey, model, quality, signal, fetchImpl }) {
  if (!apiKey) throw new AppError(ErrorCode.PROVIDER_AUTH_FAILED, 'An OpenAI API key is required for image generation.');
  const response = await fetchImpl('https://api.openai.com/v1/images/generations', {
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, prompt, quality, size: '1024x1024', output_format: 'png' })
  });
  const body = await safeJson(response);
  if (!response.ok) throw new AppError(response.status === 401 || response.status === 403 ? ErrorCode.PROVIDER_AUTH_FAILED : ErrorCode.PROVIDER_UNAVAILABLE, `OpenAI image generation failed (${response.status}).`, { status: response.status });
  const image = findImagePayload(body?.data?.[0]);
  if (!image) throw new AppError(ErrorCode.PROVIDER_RESPONSE_INVALID, 'OpenAI did not return a generated image.');
  return image;
}

export async function generateImage(request, { signal, fetchImpl = fetch } = {}) {
  const selected = IMAGE_MODEL_REGISTRY[request?.imageModel];
  if (!selected) throw new AppError(ErrorCode.PROVIDER_MODEL_UNSUPPORTED, 'The selected image model is not supported.');
  if (request?.attempt?.provider !== selected.provider) {
    throw new AppError(ErrorCode.PROVIDER_CAPABILITY_UNSUPPORTED, `Select an active ${selected.provider} configuration to use ${request.imageModel}.`);
  }
  const common = { prompt: requirePrompt(request.prompt), apiKey: request.attempt.apiKey, signal, fetchImpl, ...selected };
  return selected.provider === 'gemini' ? generateGemini(common) : generateOpenAi(common);
}
