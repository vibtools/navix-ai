// Unified AI Provider Manager

import { getAISettings } from '../settings/aiSettings.js';
import { callGemini } from './providers/geminiProvider.js';
import { callOpenAI } from './providers/openaiProvider.js';

export async function sendAIRequest(prompt, context = '') {
  const settings = await getAISettings();

  const finalPrompt = `
Context:
${context}

User Request:
${prompt}
`;

  if (!settings.apiKey) {
    throw new Error('AI API key is not configured');
  }

  switch (settings.provider) {
    case 'gemini':
      return callGemini(finalPrompt, settings.apiKey, settings.model);

    case 'openai':
      return callOpenAI(finalPrompt, settings.apiKey, settings.model);

    default:
      throw new Error('Unsupported AI provider');
  }
}
