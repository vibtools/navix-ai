// Unified AI Provider Manager

import { getAISettings } from '../settings/aiSettings.js';

export async function sendAIRequest(prompt, context = '') {
  const settings = await getAISettings();

  if (!settings.apiKey) {
    throw new Error('AI API key is not configured');
  }

  switch (settings.provider) {
    case 'gemini':
      return sendGeminiRequest(prompt, context, settings);
    case 'openai':
      return sendOpenAIRequest(prompt, context, settings);
    case 'custom':
      return sendCustomRequest(prompt, context, settings);
    default:
      throw new Error('Unsupported AI provider');
  }
}

async function sendGeminiRequest(prompt, context, settings) {
  return `Gemini provider ready. Prompt: ${prompt}`;
}

async function sendOpenAIRequest(prompt, context, settings) {
  return `OpenAI provider ready. Prompt: ${prompt}`;
}

async function sendCustomRequest(prompt, context, settings) {
  return `Custom provider ready. Prompt: ${prompt}`;
}
