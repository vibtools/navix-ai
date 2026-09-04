// AI request routing layer

export async function routeAIRequest({ userMessage, pageContext }) {
  return {
    provider: 'pending',
    message: userMessage,
    context: pageContext,
    response: 'AI provider connection will be attached in the provider layer.'
  };
}
