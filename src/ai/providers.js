const providers = {
  gemini: null,
  openai: null,
  custom: null
};

export function setProvider(name, handler) {
  providers[name] = handler;
}

export async function sendAIRequest(provider, payload) {
  if (!providers[provider]) {
    throw new Error(`AI provider ${provider} is not configured`);
  }

  return providers[provider](payload);
}
