const DEFAULT_AGENT_INSTRUCTION = 'You are Navix AI, an autonomous browser copilot. Help the user accurately and use browser tools only when needed. When targeting page elements, prefer the data-ai-id selector from page context.';

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function buildPromptContext(request) {
  const instructions = [DEFAULT_AGENT_INSTRUCTION];
  const systemPrompt = clean(request.systemPrompt);
  const customInstruction = request.customInstructionsEnabled === false ? '' : clean(request.customInstruction);
  const responseLanguage = clean(request.responseLanguage);

  if (systemPrompt) instructions.push(`[USER SYSTEM PROMPT]\n${systemPrompt}`);
  if (customInstruction) instructions.push(`[CUSTOM INSTRUCTIONS]\n${customInstruction}`);
  if (responseLanguage && responseLanguage !== 'Auto') {
    instructions.push(`[RESPONSE LANGUAGE]\nRespond in ${responseLanguage}.`);
  }
  if (request.thinkMode) {
    instructions.push('[THINKING MODE]\nAnalyze carefully before answering and provide a concise explanation of the result.');
  }

  const contextSections = [];
  const pageContext = clean(request.pageContext || request.domContext);
  if (pageContext) contextSections.push(`[CURRENT PAGE CONTEXT]\n${pageContext}`);

  const attachments = Array.isArray(request.attachments) ? request.attachments : [];
  for (const attachment of attachments) {
    const name = clean(attachment?.name) || 'attachment';
    const content = clean(attachment?.content);
    if (content) contextSections.push(`[ATTACHED FILE: ${name}]\n${content}`);
  }

  const contextText = contextSections.join('\n\n');
  const message = clean(request.message);
  return {
    systemInstruction: instructions.join('\n\n'),
    userText: contextText ? `${message}\n\n${contextText}` : message,
    screenshotDataUrl: clean(request.screenshotDataUrl)
  };
}
