import { GoogleGenAI } from '@google/genai';
import { AppError, ErrorCode } from '../core/errorContract.js';
import { toGeminiTools } from '../core/browserTools.js';
import { normalizeToolCall, ProviderId } from '../core/providerContract.js';
import { normalizeProviderFailure, providerHttpError } from '../core/providerErrors.js';
import { throwIfAborted } from '../core/requestLifecycle.js';

function toGeminiContents(messages, prompt) {
  const contents = [];
  messages.forEach((message, index) => {
    if (message.role === 'tool') {
      const toolResults = message.toolResults || [{ name: message.name, result: message.result }];
      const parts = toolResults.map((result) => ({
        functionResponse: { name: result.name, response: result.result }
      }));
      const previous = contents[contents.length - 1];
      if (previous?.role === 'user' && previous.__toolResponse) previous.parts.push(...parts);
      else contents.push({ role: 'user', parts, __toolResponse: true });
      return;
    }

    if (message.role === 'assistant' && message.providerState?.geminiParts?.length) {
      contents.push({ role: 'model', parts: message.providerState.geminiParts });
      return;
    }

    const parts = [];
    if (message.content) parts.push({ text: message.content });
    for (const call of message.toolCalls || []) parts.push({ functionCall: { name: call.name, args: call.args } });
    const isCurrentUser = message.role === 'user' && (message.requestInput || index === messages.length - 1);
    if (isCurrentUser && prompt.screenshotDataUrl) {
      const [metadata, data] = prompt.screenshotDataUrl.split(',', 2);
      const mimeType = metadata.match(/^data:([^;]+)/)?.[1] || 'image/jpeg';
      if (data) parts.push({ inlineData: { data, mimeType } });
    }
    contents.push({ role: message.role === 'assistant' ? 'model' : 'user', parts });
  });
  return contents.map(({ __toolResponse, ...content }) => content);
}

export const geminiAdapter = Object.freeze({
  id: ProviderId.GEMINI,
  capabilities: Object.freeze({ streaming: true, tools: true, screenshot: true }),
  async generate(context) {
    const createClient = context.createGeminiClient || ((apiKey) => new GoogleGenAI({ apiKey }));
    const ai = createClient(context.attempt.apiKey);
    let stream;
    try {
      stream = await ai.models.generateContentStream({
        model: context.attempt.model,
        contents: toGeminiContents(context.messages, context.prompt),
        config: {
          systemInstruction: context.prompt.systemInstruction,
          abortSignal: context.signal,
          ...(context.tools?.length ? { tools: toGeminiTools() } : {})
        }
      });
    } catch (error) {
      if (Number.isInteger(error?.status)) {
        throw providerHttpError(ProviderId.GEMINI, error.status, error.message || '');
      }
      throw normalizeProviderFailure(ProviderId.GEMINI, error);
    }

    let text = '';
    const toolCalls = [];
    const geminiParts = [];
    try {
      for await (const chunk of stream) {
        throwIfAborted(context.signal);
        const parts = chunk?.candidates?.[0]?.content?.parts;
        if (Array.isArray(parts)) geminiParts.push(...parts);
        if (typeof chunk?.text === 'string' && chunk.text) {
          text += chunk.text;
          context.onChunk(chunk.text);
        }
        const calls = Array.isArray(parts)
          ? parts.flatMap((part) => part?.functionCall ? [part.functionCall] : [])
          : (chunk?.functionCalls || []);
        for (const call of calls) {
          toolCalls.push(normalizeToolCall({ name: call.name, args: call.args }, toolCalls.length));
        }
      }
    } catch (error) {
      throw normalizeProviderFailure(ProviderId.GEMINI, error);
    }

    return {
      text,
      toolCalls,
      providerState: { geminiParts }
    };
  },
  async probe(context) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(context.attempt.model)}?key=${encodeURIComponent(context.attempt.apiKey)}`;
    let response;
    try {
      response = await (context.fetchImpl || fetch)(url, { signal: context.signal });
    } catch (error) {
      throw normalizeProviderFailure(ProviderId.GEMINI, error);
    }
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw providerHttpError(ProviderId.GEMINI, response.status, body, response.headers?.get?.('Retry-After'));
    }
    let data;
    try {
      data = await response.json();
    } catch (cause) {
      throw new AppError(ErrorCode.PROVIDER_RESPONSE_INVALID, 'Gemini returned invalid model metadata.', { cause, source: ProviderId.GEMINI });
    }
    const methods = Array.isArray(data?.supportedGenerationMethods) ? data.supportedGenerationMethods : [];
    if (!methods.includes('generateContent')) {
      throw new AppError(ErrorCode.PROVIDER_MODEL_UNSUPPORTED, 'The selected Gemini model does not support chat generation.', { source: ProviderId.GEMINI });
    }
    return { ok: true, modelVerified: true, model: context.attempt.model };
  }
});
