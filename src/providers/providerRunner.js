import { BROWSER_TOOL_DEFINITIONS, validateBrowserToolCall } from '../core/browserTools.js';
import { AppError, ErrorCode, isAbortError } from '../core/errorContract.js';
import { buildPromptContext } from '../core/promptContext.js';
import { normalizeProviderAttempts, publicProviderAttempt } from '../core/providerContract.js';
import { canFallbackProviderError, canRetryProviderError, normalizeProviderFailure } from '../core/providerErrors.js';
import { abortableDelay, throwIfAborted } from '../core/requestLifecycle.js';
import { normalizeUiHistory, validateChatRequest } from '../core/sessionProtocol.js';
import { getProviderAdapter, providerRegistry } from './providerRegistry.js';

const MAX_TOOL_ITERATIONS = 15;
const MAX_PROVIDER_RETRIES = 3;

function initialMessages(request, prompt) {
  return [
    ...normalizeUiHistory(request.chatHistory).map(({ role, text }) => ({ role, content: text })),
    { role: 'user', content: prompt.userText, requestInput: true }
  ];
}

async function generateWithTimeout(adapter, context, timeoutMs = 60000) {
  const controller = new AbortController();
  const onAbort = () => controller.abort(context.signal?.reason);
  context.signal?.addEventListener('abort', onAbort, { once: true });
  const timer = setTimeout(() => {
    controller.abort(new AppError(ErrorCode.PROVIDER_UNAVAILABLE, 'The provider request timed out.', {
      source: adapter.id,
      retryable: true
    }));
  }, timeoutMs);
  try {
    return await adapter.generate({ ...context, signal: controller.signal });
  } catch (error) {
    if (!context.signal?.aborted && controller.signal.reason instanceof AppError) {
      throw controller.signal.reason;
    }
    throw error;
  } finally {
    clearTimeout(timer);
    context.signal?.removeEventListener('abort', onAbort);
  }
}

async function generateWithRetry(adapter, context, activity, allowRetry) {
  for (let retry = 0; retry < MAX_PROVIDER_RETRIES; retry += 1) {
    try {
      return await generateWithTimeout(adapter, context, context.timeoutMs || 60000);
    } catch (cause) {
      const error = normalizeProviderFailure(adapter.id, cause);
      const mayRetry = allowRetry && !activity.emittedOutput && !activity.toolExecuted
        && canRetryProviderError(error) && retry < MAX_PROVIDER_RETRIES - 1;
      if (!mayRetry) throw error;
      const delay = error.retryAfterMs ?? Math.min(2000 * (2 ** retry), 8000);
      context.onStatus?.(`${adapter.id} temporarily unavailable. Retrying in ${Math.ceil(delay / 1000)}s...`);
      await abortableDelay(delay, context.signal);
    }
  }
  throw new AppError(ErrorCode.PROVIDER_UNAVAILABLE, 'The provider did not complete the request.', { source: adapter.id });
}

async function runSingleProvider(request, attempt, options, activity) {
  const registry = options.registry || providerRegistry;
  const adapter = getProviderAdapter(attempt.provider, registry);
  if (!adapter) throw new AppError(ErrorCode.INVALID_REQUEST, 'A supported AI provider is required.');

  const prompt = buildPromptContext(request);
  if (prompt.screenshotDataUrl && !adapter.capabilities.screenshot) {
    throw new AppError(ErrorCode.PROVIDER_CAPABILITY_UNSUPPORTED, 'The selected provider does not support screenshot context.', { source: adapter.id });
  }
  const tools = options.toolExecutor && adapter.capabilities.tools ? BROWSER_TOOL_DEFINITIONS : [];
  const messages = initialMessages(request, prompt);

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration += 1) {
    throwIfAborted(options.signal);
    const context = {
      attempt,
      messages,
      prompt,
      tools,
      request,
      signal: options.signal,
      fetchImpl: options.fetchImpl,
      createGeminiClient: options.createGeminiClient,
      timeoutMs: options.timeoutMs,
      onStatus: options.onStatus,
      onChunk: (chunk) => {
        if (!chunk) return;
        activity.emittedOutput = true;
        options.onChunk?.(chunk);
      }
    };
    const result = await generateWithRetry(adapter, context, activity, iteration === 0);
    const toolCalls = Array.isArray(result.toolCalls) ? result.toolCalls : [];
    if (!result.text && !toolCalls.length) {
      throw new AppError(ErrorCode.PROVIDER_RESPONSE_INVALID, 'The provider returned an empty response.', { source: adapter.id });
    }
    if (!toolCalls.length) return result.text || '';
    if (!options.toolExecutor) {
      throw new AppError(ErrorCode.PROVIDER_CAPABILITY_UNSUPPORTED, 'Browser tools are unavailable in this runtime.', { source: adapter.id });
    }

    const validatedCalls = toolCalls.map(validateBrowserToolCall);
    options.onStatus?.(`Executing: ${validatedCalls.map((call) => call.name).join(', ')}...`);
    messages.push({
      role: 'assistant',
      content: result.text || '',
      toolCalls: validatedCalls,
      providerState: result.providerState
    });

    const toolResults = [];
    for (const call of validatedCalls) {
      throwIfAborted(options.signal);
      activity.toolExecuted = true;
      const resultValue = await options.toolExecutor(call.name, call.args, options.signal);
      if (resultValue === undefined || resultValue === null) {
        throw new AppError(ErrorCode.TOOL_RESULT_UNVERIFIED, 'The browser tool did not return a verifiable result.');
      }
      toolResults.push({ id: call.id, name: call.name, result: resultValue });
    }
    messages.push({ role: 'tool', toolResults });
  }

  options.onChunk?.('\n\n*[Stopped automatically after reaching the browser-action step limit.]*');
  return '';
}

export async function runProviderRequest(rawRequest, options = {}) {
  const request = validateChatRequest(rawRequest);
  const attempts = normalizeProviderAttempts(request);
  const activity = { emittedOutput: false, toolExecuted: false };
  let lastError = null;

  for (let index = 0; index < attempts.length; index += 1) {
    const attempt = attempts[index];
    try {
      if (index > 0) options.onStatus?.(`Switched to fallback provider (${attempt.provider}/${attempt.model})...`);
      return await runSingleProvider(request, attempt, options, activity);
    } catch (error) {
      if (isAbortError(error) || options.signal?.aborted) throw error;
      lastError = error;
      const hasNext = index < attempts.length - 1;
      if (!hasNext || activity.toolExecuted || !canFallbackProviderError(error, activity.emittedOutput)) throw error;
    }
  }
  throw lastError || new AppError(ErrorCode.PROVIDER_UNAVAILABLE, 'No provider could complete the request.');
}

export async function probeProvider(rawAttempt, options = {}) {
  const [attempt] = normalizeProviderAttempts({
    message: 'provider diagnostic',
    model: rawAttempt?.provider,
    providerAttempts: [rawAttempt]
  });
  const adapter = getProviderAdapter(attempt.provider, options.registry || providerRegistry);
  if (!adapter?.probe) {
    throw new AppError(ErrorCode.PROVIDER_CAPABILITY_UNSUPPORTED, 'Provider diagnostics are unavailable.', { source: attempt.provider });
  }
  const controller = new AbortController();
  const onAbort = () => controller.abort(options.signal?.reason);
  options.signal?.addEventListener('abort', onAbort, { once: true });
  const timer = setTimeout(() => {
    controller.abort(new AppError(ErrorCode.PROVIDER_UNAVAILABLE, 'The provider diagnostic timed out.', {
      source: attempt.provider,
      retryable: true
    }));
  }, options.timeoutMs || 20000);
  try {
    const result = await adapter.probe({
      attempt,
      signal: controller.signal,
      fetchImpl: options.fetchImpl,
      createGeminiClient: options.createGeminiClient
    });
    return { ...result, provider: publicProviderAttempt(attempt) };
  } catch (error) {
    if (!options.signal?.aborted && controller.signal.reason instanceof AppError) {
      throw controller.signal.reason;
    }
    throw error;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', onAbort);
  }
}
