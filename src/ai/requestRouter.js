// AI request routing layer

import { sendAIRequest } from './providerManager.js';

export async function routeAIRequest({ userMessage, pageContext }) {
  const contextText = JSON.stringify(pageContext || {});

  const response = await sendAIRequest(
    userMessage,
    contextText
  );

  return {
    provider: 'active',
    message: userMessage,
    context: pageContext,
    response
  };
}
