import { ProviderId } from '../core/providerContract.js';
import { openAiCompatibleGenerate, openAiCompatibleProbe } from './openAiCompatible.js';

export const openAiAdapter = Object.freeze({
  id: ProviderId.OPENAI,
  capabilities: Object.freeze({ streaming: true, tools: true, screenshot: true }),
  generate(context) {
    return openAiCompatibleGenerate({
      ...context,
      provider: ProviderId.OPENAI,
      url: 'https://api.openai.com/v1/chat/completions',
      apiKey: context.attempt.apiKey,
      model: context.attempt.model
    });
  },
  probe(context) {
    return openAiCompatibleProbe({
      ...context,
      provider: ProviderId.OPENAI,
      url: 'https://api.openai.com/v1/models',
      apiKey: context.attempt.apiKey,
      model: context.attempt.model
    });
  }
});
