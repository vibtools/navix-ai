import { AppError, ErrorCode } from '../core/errorContract.js';
import { normalizeToolCall } from '../core/providerContract.js';
import { providerHttpError, normalizeProviderFailure } from '../core/providerErrors.js';
import { consumeSseJson } from '../core/sseParser.js';

function imageContent(text, screenshotDataUrl) {
  if (!screenshotDataUrl) return text;
  return [
    { type: 'text', text },
    { type: 'image_url', image_url: { url: screenshotDataUrl } }
  ];
}

export function toOpenAiMessages(messages, prompt) {
  return [
    { role: 'system', content: prompt.systemInstruction },
    ...messages.flatMap((message, index) => {
      if (message.role === 'assistant' && Array.isArray(message.toolCalls)) {
        return [{
          role: 'assistant',
          content: message.content || null,
          tool_calls: message.toolCalls.map((call) => ({
            id: call.id,
            type: 'function',
            function: { name: call.name, arguments: JSON.stringify(call.args) }
          }))
        }];
      }
      if (message.role === 'tool') {
        const toolResults = Array.isArray(message.toolResults)
          ? message.toolResults
          : [{ id: message.toolCallId, result: message.result }];
        return toolResults.map((toolResult) => ({
          role: 'tool',
          tool_call_id: toolResult.id,
          content: JSON.stringify(toolResult.result)
        }));
      }
      const isCurrentUser = message.role === 'user' && (message.requestInput || index === messages.length - 1);
      return [{
        role: message.role,
        content: isCurrentUser ? imageContent(message.content, prompt.screenshotDataUrl) : message.content
      }];
    })
  ];
}

function parseArguments(value) {
  try {
    const args = JSON.parse(value || '{}');
    if (!args || typeof args !== 'object' || Array.isArray(args)) throw new Error('Arguments must be an object.');
    return args;
  } catch (cause) {
    throw new AppError(ErrorCode.TOOL_CALL_INVALID, 'The provider returned malformed browser tool arguments.', { cause });
  }
}

export async function openAiCompatibleGenerate({
  provider,
  url,
  apiKey,
  model,
  messages,
  prompt,
  tools,
  onChunk,
  signal,
  fetchImpl = fetch,
  stream = true,
  maxTokens
}) {
  let response;
  try {
    response = await fetchImpl(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
      },
      body: JSON.stringify({
        model,
        messages: toOpenAiMessages(messages, prompt),
        stream,
        ...(tools?.length ? { tools } : {}),
        ...(maxTokens ? { max_tokens: maxTokens } : {})
      }),
      signal
    });
  } catch (error) {
    throw normalizeProviderFailure(provider, error);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw providerHttpError(provider, response.status, body, response.headers?.get?.('Retry-After'));
  }

  if (!stream) {
    let data;
    try {
      data = await response.json();
    } catch (cause) {
      throw new AppError(ErrorCode.PROVIDER_RESPONSE_INVALID, 'The provider returned invalid JSON.', { cause, source: provider });
    }
    const message = data?.choices?.[0]?.message;
    if (!message) {
      throw new AppError(ErrorCode.PROVIDER_RESPONSE_INVALID, 'The provider returned an invalid chat response.', { source: provider });
    }
    const text = typeof message.content === 'string' ? message.content : '';
    if (text) onChunk(text);
    return {
      text,
      toolCalls: (message.tool_calls || []).map((call, index) => normalizeToolCall({
        id: call.id,
        name: call.function?.name,
        args: typeof call.function?.arguments === 'string'
          ? parseArguments(call.function.arguments)
          : call.function?.arguments
      }, index))
    };
  }

  let text = '';
  const toolCallParts = [];
  await consumeSseJson(response.body, (event) => {
    if (event?.error) {
      throw providerHttpError(provider, Number(event.error.status) || 500, JSON.stringify(event.error));
    }
    const delta = event?.choices?.[0]?.delta;
    if (!delta) return;
    if (typeof delta.content === 'string' && delta.content) {
      text += delta.content;
      onChunk(delta.content);
    }
    for (const part of delta.tool_calls || []) {
      const index = Number.isInteger(part.index) ? part.index : toolCallParts.length;
      const current = toolCallParts[index] || { id: '', name: '', arguments: '' };
      if (part.id) current.id += part.id;
      if (part.function?.name) current.name += part.function.name;
      if (part.function?.arguments) current.arguments += part.function.arguments;
      toolCallParts[index] = current;
    }
  }, signal);

  return {
    text,
    toolCalls: toolCallParts.filter(Boolean).map((call, index) => normalizeToolCall({
      id: call.id,
      name: call.name,
      args: parseArguments(call.arguments)
    }, index))
  };
}

export async function openAiCompatibleProbe({ provider, url, apiKey, model, signal, fetchImpl = fetch }) {
  let response;
  try {
    response = await fetchImpl(url, {
      headers: { ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}) },
      signal
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
    throw new AppError(ErrorCode.PROVIDER_RESPONSE_INVALID, 'The provider returned invalid model metadata.', { cause, source: provider });
  }
  const models = Array.isArray(data?.data) ? data.data : Array.isArray(data?.models) ? data.models : [];
  const found = models.some((entry) => (entry?.id || entry?.name || entry?.model) === model);
  if (models.length && !found) {
    throw new AppError(ErrorCode.PROVIDER_MODEL_UNSUPPORTED, 'The selected model is not available from this provider.', { source: provider });
  }
  return { ok: true, modelVerified: found, model };
}
