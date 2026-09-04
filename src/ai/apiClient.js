// Unified AI API connector foundation

export async function sendToAI(provider, prompt, context = {}) {
  if (!provider) {
    throw new Error('AI provider is not configured');
  }

  return {
    provider,
    prompt,
    context,
    status: 'connector-ready'
  };
}
