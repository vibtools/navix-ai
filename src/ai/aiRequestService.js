import { getActiveProvider } from './providerManager';
import { getPageContext } from '../content/domReader';

export async function processUserCommand(message) {
  const context = await getPageContext();

  const prompt = `
You are an AI Browser Copilot.

Current webpage:
Title: ${context.title}
URL: ${context.url}
Content:
${context.text}

User command:
${message}
`;

  const provider = getActiveProvider();
  return provider.sendMessage(prompt);
}
