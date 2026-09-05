import { ErrorCode, isAbortError, toErrorPayload } from '../core/errorContract.js';
import { createRequestLifecycle, throwIfAborted } from '../core/requestLifecycle.js';
import { CHAT_REQUEST, CLEAR_HISTORY, PROVIDER_PROBE, validateChatRequest } from '../core/sessionProtocol.js';
import { probeProvider, runProviderRequest } from '../providers/providerRunner.js';
import { classifyBrowserAction, describeAction, normalizeBrowserAction } from '../core/actionPolicy.js';
import { ACTION_DECISION, createConfirmationBroker } from '../core/confirmationProtocol.js';
import { generateImage, IMAGE_CANCEL_REQUEST, IMAGE_GENERATE_REQUEST } from '../capabilities/imageGeneration.js';

const imageRequests = new Map();

function safeHttpOrigin(value, base) {
  try {
    const parsed = base ? new URL(value, base) : new URL(value);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.origin : '';
  } catch {
    return '';
  }
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('Navix AI installed (Manifest V3)');
  // Enable side panel to open on extension icon click
  if (chrome.sidePanel) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);
  }
});

function chromeCallback(run, fallbackMessage) {
  return new Promise((resolve, reject) => {
    run((value) => {
      const error = chrome.runtime.lastError;
      if (error) reject(new Error(error.message || fallbackMessage));
      else resolve(value);
    });
  });
}

async function currentTab() {
  const tabs = await chromeCallback((done) => chrome.tabs.query({ active: true, currentWindow: true }, done), 'Unable to query the active tab.');
  const tab = tabs?.[0];
  if (!tab?.id) throw new Error('No active tab found.');
  return tab;
}

async function sendTabMessage(tabId, message) {
  try {
    return await chromeCallback((done) => chrome.tabs.sendMessage(tabId, message, done), 'Content script is unavailable.');
  } catch {
    try {
      await chrome.scripting.executeScript({ target: { tabId }, files: ['src/content.js'] });
      return await chromeCallback((done) => chrome.tabs.sendMessage(tabId, message, done), 'Content script is unavailable.');
    } catch (cause) {
      return { success: false, code: ErrorCode.PERMISSION_REQUIRED, error: 'Page access is required. Open Navix AI from the target tab or grant access for this site.', cause: String(cause?.message || cause) };
    }
  }
}

function updateTabAndWait(tabId, url, actionMessage, signal) {
  return new Promise((resolve) => {
    let settled = false;
    let completionDelay;
    const cleanup = () => {
      chrome.tabs.onUpdated.removeListener(listener);
      clearTimeout(timeout);
      clearTimeout(completionDelay);
      signal?.removeEventListener('abort', onAbort);
    };
    const finish = (result) => { if (!settled) { settled = true; cleanup(); resolve(result); } };
    const onAbort = () => finish({ success: false, code: ErrorCode.CANCELLED, error: 'Action cancelled.' });
    const listener = (updatedTabId, changeInfo) => {
      if (updatedTabId === tabId && changeInfo.status === 'complete') {
        completionDelay = setTimeout(() => finish({ success: true, message: `${actionMessage} successful` }), 300);
      }
    };
    const timeout = setTimeout(() => finish({ success: false, code: ErrorCode.TOOL_RESULT_UNVERIFIED, error: `${actionMessage} could not be verified before timeout.` }), 10_000);
    signal?.addEventListener('abort', onAbort, { once: true });
    chrome.tabs.onUpdated.addListener(listener);
    chrome.tabs.update(tabId, { url }, (tab) => {
      if (chrome.runtime.lastError || !tab) finish({ success: false, code: ErrorCode.TOOL_RESULT_UNVERIFIED, error: 'Failed to load the approved page.' });
    });
  });
}

async function executeTool(name, args, signal, options = {}) {
  throwIfAborted(signal);
  const tab = await currentTab();
  const action = normalizeBrowserAction(name, args, { searchEngine: options.searchEngine });
  if (action.name === 'web_search' && !options.searchEnabled) {
    return { success: false, code: ErrorCode.CAPABILITY_UNAVAILABLE, error: 'Web Search is disabled in Navix AI settings.' };
  }
  let target = {};
  if (['click_element', 'type_text', 'press_enter'].includes(action.name)) {
    const inspection = await sendTabMessage(tab.id, { action: 'inspect_target', args: action.args });
    if (!inspection?.success) return inspection;
    target = inspection.target || {};
  }
  const policy = classifyBrowserAction(action, { target, currentUrl: tab.url || '' });
  if (policy.requiresConfirmation) {
    if (!options.confirmAction) throw new Error('This action requires interactive approval.');
    const destination = action.args.url || target.href || target.formAction || '';
    await options.confirmAction({
      requestId: options.requestId,
      sessionId: options.sessionId,
      tabId: tab.id,
      origin: safeHttpOrigin(tab.url),
      requiredOrigin: destination ? safeHttpOrigin(destination, tab.url) : '',
      risk: policy.risk,
      reason: policy.reason,
      action: describeAction(action, target)
    });
  }
  throwIfAborted(signal);
  if (action.name === 'navigate') return updateTabAndWait(tab.id, action.args.url, `Navigation to ${action.args.url}`, signal);
  if (action.name === 'web_search') return updateTabAndWait(tab.id, action.args.url, `${action.args.engine} search`, signal);
  const response = await sendTabMessage(tab.id, { action: action.name, args: action.args, expectedTarget: target.fingerprint || '' });
  if (response?.error && response.code !== ErrorCode.DOM_TARGET_AMBIGUOUS && /element not found/i.test(response.error) && action.name !== 'read_page' && options.refreshStale !== false) {
    const contextResponse = await sendTabMessage(tab.id, { action: 'get_page_context' });
    return { success: false, code: ErrorCode.DOM_TARGET_STALE, error: 'The page target is stale. Page context was refreshed once.', refreshedContext: contextResponse?.text || '' };
  }
  return response || { success: false, code: ErrorCode.TOOL_RESULT_UNVERIFIED, error: 'No response from page.' };
}

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'chat_stream') {
    let activeRequest = null;
    const confirmations = createConfirmationBroker();
    port.onMessage.addListener(async (message) => {
      if (message.type === ACTION_DECISION) {
        confirmations.decide(message);
        return;
      }
      if (message.type === CHAT_REQUEST) {
        activeRequest?.abort();
        confirmations.cancelAll();
        const lifecycle = createRequestLifecycle(port, message.requestId || null);
        activeRequest = lifecycle;
        try {
          const request = validateChatRequest(message);
          await handleAIRequestStream(request, lifecycle, {
            confirmAction: (details) => confirmations.request(details, (payload) => lifecycle.post(payload), lifecycle.signal)
          });
          lifecycle.complete();
        } catch (error) {
          if (!isAbortError(error)) {
            lifecycle.fail(error);
          }
        } finally {
          if (activeRequest === lifecycle) activeRequest = null;
        }
      }
    });
    port.onDisconnect.addListener(() => confirmations.cancelAll());
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === CLEAR_HISTORY) {
    sendResponse({ success: true, sessionId: message.sessionId || null });
    return false;
  }

  if (message.type === PROVIDER_PROBE) {
    const controller = new AbortController();
    probeProvider(message.attempt, { signal: controller.signal })
      .then((result) => sendResponse({ success: true, result }))
      .catch((error) => sendResponse({ success: false, error: toErrorPayload(error) }));
    return true;
  }

  if (message.type === IMAGE_GENERATE_REQUEST) {
    if (!message.requestId || typeof message.requestId !== 'string') {
      sendResponse({ success: false, error: toErrorPayload(new Error('Image request ID is required.')) });
      return false;
    }
    imageRequests.get(message.requestId)?.abort();
    const controller = new AbortController();
    imageRequests.set(message.requestId, controller);
    const timer = setTimeout(() => controller.abort(), 120_000);
    generateImage(message, { signal: controller.signal })
      .then((result) => sendResponse({ success: true, result }))
      .catch((error) => sendResponse({ success: false, error: toErrorPayload(error) }))
      .finally(() => {
        clearTimeout(timer);
        if (imageRequests.get(message.requestId) === controller) imageRequests.delete(message.requestId);
      });
    return true;
  }

  if (message.type === IMAGE_CANCEL_REQUEST) {
    const controller = imageRequests.get(message.requestId);
    controller?.abort();
    imageRequests.delete(message.requestId);
    sendResponse({ success: Boolean(controller) });
    return false;
  }

  if (message.type === CHAT_REQUEST) {
    // Keep standard message listener working for old requests just in case, but we redirect logic 
    // to a pseudo-port so we don't duplicate code
    let responseText = '';
    let responseError = null;
    const pseudoPort = {
       postMessage: (msg) => {
          if (msg.chunk) responseText += msg.chunk;
          if (msg.error) responseError = msg.error;
          if (msg.done) {
            sendResponse(responseError
              ? { error: responseError }
              : { response: responseText || 'Action completed.' });
          }
       }
    };
    const lifecycle = createRequestLifecycle(pseudoPort, message.requestId || null);
    try {
      const request = validateChatRequest(message);
      handleAIRequestStream(request, lifecycle)
        .then(() => lifecycle.complete())
        .catch((error) => lifecycle.fail(error));
    } catch (error) {
      lifecycle.fail(error);
    }
    return true; 
  }
});

async function handleAIRequestStream(request, lifecycle, options = {}) {
  const { signal } = lifecycle;
  throwIfAborted(signal);
  
  let screenshotDataUrl = null;
  if (request.includeScreenshot) {
    try {
      screenshotDataUrl = await new Promise((resolve) => {
        chrome.tabs.captureVisibleTab(null, { format: 'jpeg', quality: 50 }, (dataUrl) => {
          if (chrome.runtime.lastError) resolve(null);
          else resolve(dataUrl);
        });
      });
    } catch (e) {
      console.warn("Screenshot failed", e);
    }
  }
  throwIfAborted(signal);

  let staleRefreshUsed = false;
  await runProviderRequest({ ...request, screenshotDataUrl }, {
    signal,
    toolExecutor: async (name, args, toolSignal) => {
      const result = await executeTool(name, args, toolSignal, {
        refreshStale: !staleRefreshUsed,
        searchEngine: request.searchEngine,
        searchEnabled: request.searchEnabled,
        requestId: request.requestId,
        sessionId: request.sessionId,
        confirmAction: options.confirmAction
      });
      if (result?.code === ErrorCode.DOM_TARGET_STALE) staleRefreshUsed = true;
      return result;
    },
    onChunk: (chunk) => lifecycle.post({ chunk }),
    onStatus: (status) => lifecycle.post({ status })
  });
}
