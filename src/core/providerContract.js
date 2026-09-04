import { AppError, ErrorCode } from './errorContract.js';

export const ProviderId = Object.freeze({
  GEMINI: 'gemini',
  OPENAI: 'openai',
  HUGGING_FACE: 'huggingface',
  OLLAMA: 'ollama'
});

export const PROVIDER_IDS = Object.freeze(Object.values(ProviderId));

export const DEFAULT_MODELS = Object.freeze({
  [ProviderId.GEMINI]: 'gemini-2.5-flash',
  [ProviderId.OPENAI]: 'gpt-4o',
  [ProviderId.HUGGING_FACE]: 'mistralai/Mistral-Nemo-Instruct-2407',
  [ProviderId.OLLAMA]: 'llama3'
});

const LEGACY_FIELDS = Object.freeze({
  [ProviderId.GEMINI]: { credential: 'geminiApiKey', model: 'geminiModel' },
  [ProviderId.OPENAI]: { credential: 'openAiApiKey', model: 'openAiModel' },
  [ProviderId.HUGGING_FACE]: { credential: 'hfApiKey', model: 'hfModel' },
  [ProviderId.OLLAMA]: { credential: 'ollamaUrl', model: 'ollamaModel' }
});

function requiredString(value, code, message, source) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new AppError(code, message, { source });
  }
  return value.trim();
}

export function normalizeProviderId(value) {
  const provider = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!PROVIDER_IDS.includes(provider)) {
    throw new AppError(ErrorCode.INVALID_REQUEST, 'A supported AI provider is required.');
  }
  return provider;
}

export function normalizeProviderAttempt(rawAttempt, legacyRequest = {}) {
  const provider = normalizeProviderId(rawAttempt?.provider || rawAttempt?.model || legacyRequest.model);
  const legacy = LEGACY_FIELDS[provider];
  const model = requiredString(
    rawAttempt?.modelId || rawAttempt?.modelName || rawAttempt?.selectedModel || legacyRequest[legacy.model] || DEFAULT_MODELS[provider],
    ErrorCode.PROVIDER_MODEL_UNSUPPORTED,
    `A ${provider} model is required.`,
    provider
  );

  if (provider === ProviderId.OLLAMA) {
    const baseUrl = requiredString(
      rawAttempt?.baseUrl || rawAttempt?.url || legacyRequest[legacy.credential],
      ErrorCode.PROVIDER_UNAVAILABLE,
      'Ollama URL is missing.',
      provider
    ).replace(/\/+$/, '');
    return Object.freeze({ provider, model, baseUrl });
  }

  const apiKey = requiredString(
    rawAttempt?.apiKey || legacyRequest[legacy.credential],
    ErrorCode.PROVIDER_AUTH_FAILED,
    `${provider === ProviderId.HUGGING_FACE ? 'Hugging Face token' : `${provider} API key`} is missing.`,
    provider
  );
  return Object.freeze({ provider, model, apiKey });
}

export function normalizeProviderAttempts(request) {
  const rawAttempts = Array.isArray(request?.providerAttempts) && request.providerAttempts.length
    ? request.providerAttempts
    : [{ provider: request?.model }];

  const seen = new Set();
  return rawAttempts.flatMap((rawAttempt) => {
    const attempt = normalizeProviderAttempt(rawAttempt, request);
    const identity = `${attempt.provider}\u0000${attempt.model}\u0000${attempt.baseUrl || ''}`;
    if (seen.has(identity)) return [];
    seen.add(identity);
    return [attempt];
  });
}

export function publicProviderAttempt(attempt) {
  return {
    provider: attempt.provider,
    model: attempt.model,
    ...(attempt.baseUrl ? { baseUrl: attempt.baseUrl } : {})
  };
}

export function normalizeToolCall(call, index = 0) {
  const name = typeof call?.name === 'string' ? call.name.trim() : '';
  const args = call?.args;
  if (!name || !args || typeof args !== 'object' || Array.isArray(args)) {
    throw new AppError(ErrorCode.TOOL_CALL_INVALID, 'The provider returned an invalid browser tool call.');
  }
  return {
    id: typeof call.id === 'string' && call.id ? call.id : `tool_${index}_${name}`,
    name,
    args
  };
}
