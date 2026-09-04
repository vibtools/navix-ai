import { ProviderId } from '../core/providerContract.js';
import { geminiAdapter } from './geminiAdapter.js';
import { huggingFaceAdapter } from './huggingFaceAdapter.js';
import { ollamaAdapter } from './ollamaAdapter.js';
import { openAiAdapter } from './openAiAdapter.js';

export const providerRegistry = Object.freeze({
  [ProviderId.GEMINI]: geminiAdapter,
  [ProviderId.OPENAI]: openAiAdapter,
  [ProviderId.HUGGING_FACE]: huggingFaceAdapter,
  [ProviderId.OLLAMA]: ollamaAdapter
});

export function getProviderAdapter(provider, registry = providerRegistry) {
  return registry[provider] || null;
}
