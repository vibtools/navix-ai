import { ProviderId } from '../core/providerContract.js';
import { openAiCompatibleGenerate, openAiCompatibleProbe } from './openAiCompatible.js';

const BASE_URL = 'https://router.huggingface.co/v1';

export const huggingFaceAdapter = Object.freeze({
  id: ProviderId.HUGGING_FACE,
  capabilities: Object.freeze({ streaming: true, tools: true, screenshot: true }),
  generate(context) {
    return openAiCompatibleGenerate({
      ...context,
      provider: ProviderId.HUGGING_FACE,
      url: `${BASE_URL}/chat/completions`,
      apiKey: context.attempt.apiKey,
      model: context.attempt.model,
      maxTokens: 500
    });
  },
  probe(context) {
    return openAiCompatibleProbe({
      ...context,
      provider: ProviderId.HUGGING_FACE,
      url: `${BASE_URL}/models`,
      apiKey: context.attempt.apiKey,
      model: context.attempt.model
    });
  }
});
