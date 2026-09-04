import { AppError, ErrorCode } from '../core/errorContract.js';
import { normalizeToolCall, ProviderId } from '../core/providerContract.js';
import { normalizeProviderFailure, providerHttpError } from '../core/providerErrors.js';
import { openAiCompatibleGenerate } from './openAiCompatible.js';

function nativeMessages(messages, prompt) {
  return [
    { role: 'system', content: prompt.systemInstruction },
    ...messages.flatMap((message, index) => {
      if (message.role === 'tool') {
        return (message.toolResults || []).map((toolResult) => ({
          role: 'tool',
          content: JSON.stringify(toolResult.result),
          tool_name: toolResult.name
        }));
      }
      const native = { role: message.role, content: message.content || '' };
      if (message.role === 'assistant' && message.toolCalls?.length) {
        native.tool_calls = message.toolCalls.map((call) => ({
          function: { name: call.name, arguments: call.args }
        }));
      }
      const isCurrentUser = message.role === 'user' && (message.requestInput || index === messages.length - 1);
      if (isCurrentUser && prompt.screenshotDataUrl) {
        const data = prompt.screenshotDataUrl.split(',', 2)[1];
        if (data) native.images = [data];
      }
      return [native];
    })
  ];
}

async function nativeGenerate(context) {
  const provider = ProviderId.OLLAMA;
  let response;
  try {
    response = await (context.fetchImpl || fetch)(`${context.attempt.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: context.attempt.model,
        messages: nativeMessages(context.messages, context.prompt),
        stream: false,
        ...(context.tools?.length ? { tools: context.tools } : {}),
        ...(context.request?.thinkMode ? { think: true } : {})
      }),
      signal: context.signal
    });
  } catch (error) {
    throw normalizeProviderFailure(provider, error);
  }
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw providerHttpError(provider, response.status, body, response.headers?.get?.('Retry-After'));
  }
  let data;
  try {
    data = await response.json();
  } catch (cause) {
    throw new AppError(ErrorCode.PROVIDER_RESPONSE_INVALID, 'Ollama returned invalid JSON.', { cause, source: provider });
  }
  const message = data?.message;
  if (!message) throw new AppError(ErrorCode.PROVIDER_RESPONSE_INVALID, 'Ollama returned an invalid chat response.', { source: provider });
  const text = typeof message.content === 'string' ? message.content : '';
  if (text) context.onChunk(text);
  return {
    text,
    toolCalls: (message.tool_calls || []).map((call, index) => normalizeToolCall({
      name: call.function?.name,
      args: call.function?.arguments
    }, index))
  };
}

export const ollamaAdapter = Object.freeze({
  id: ProviderId.OLLAMA,
  capabilities: Object.freeze({ streaming: false, tools: true, screenshot: true }),
  async generate(context) {
    let emittedOutput = false;
    try {
      return await openAiCompatibleGenerate({
        ...context,
        onChunk: (chunk) => {
          emittedOutput = true;
          context.onChunk(chunk);
        },
        provider: ProviderId.OLLAMA,
        url: `${context.attempt.baseUrl}/v1/chat/completions`,
        model: context.attempt.model,
        stream: false
      });
    } catch (openAiError) {
      if (context.signal?.aborted || emittedOutput) throw openAiError;
      return nativeGenerate(context);
    }
  },
  async probe(context) {
    let response;
    try {
      response = await (context.fetchImpl || fetch)(`${context.attempt.baseUrl}/api/tags`, { signal: context.signal });
    } catch (error) {
      throw normalizeProviderFailure(ProviderId.OLLAMA, error);
    }
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw providerHttpError(ProviderId.OLLAMA, response.status, body);
    }
    let data;
    try {
      data = await response.json();
    } catch (cause) {
      throw new AppError(ErrorCode.PROVIDER_RESPONSE_INVALID, 'Ollama returned invalid model metadata.', { cause, source: ProviderId.OLLAMA });
    }
    const models = Array.isArray(data?.models) ? data.models : [];
    const found = models.some((entry) => entry?.name === context.attempt.model || entry?.model === context.attempt.model);
    if (!found) {
      throw new AppError(ErrorCode.PROVIDER_MODEL_UNSUPPORTED, 'The selected Ollama model is not installed.', { source: ProviderId.OLLAMA });
    }
    return { ok: true, modelVerified: true, model: context.attempt.model };
  }
});
