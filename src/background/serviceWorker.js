import { ErrorCode, isAbortError, toErrorPayload } from '../core/errorContract.js';
import { createRequestLifecycle, throwIfAborted } from '../core/requestLifecycle.js';
import { CHAT_REQUEST, CLEAR_HISTORY, PROVIDER_PROBE, validateChatRequest } from '../core/sessionProtocol.js';
import { probeProvider, runProviderRequest } from '../providers/providerRunner.js';

chrome.runtime.onInstalled.addListener(() => {
  console.log('Navix AI installed (Manifest V3)');
  // Enable side panel to open on extension icon click
  if (chrome.sidePanel) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);
  }
});

async function executeTool(name, args, signal, options = {}) {
  throwIfAborted(signal);
  return new Promise((resolve) => {
    let settled = false;
    let cleanupPendingAction = () => {};
    const finish = (result) => {
      if (settled) return;
      settled = true;
      cleanupPendingAction();
      signal?.removeEventListener('abort', onAbort);
      resolve(result);
    };
    const onAbort = () => finish({ error: 'Action cancelled.' });
    signal?.addEventListener('abort', onAbort, { once: true });

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (signal?.aborted) {
        finish({ error: 'Action cancelled.' });
        return;
      }
      const activeTab = tabs[0];
      if (!activeTab || !activeTab.id) {
        finish({ error: "No active tab found" });
        return;
      }

      function updateTabAndWait(tabId, updateProps, actionMsg) {
        chrome.tabs.update(tabId, updateProps, (tab) => {
          if (signal?.aborted) {
            finish({ error: 'Action cancelled.' });
            return;
          }
          if (chrome.runtime.lastError || !tab) {
            finish({ error: "Failed to load page" });
            return;
          }
          let completionDelay = null;
          const listener = (updatedTabId, changeInfo) => {
            if (updatedTabId === tabId && changeInfo.status === 'complete') {
              chrome.tabs.onUpdated.removeListener(listener);
              clearTimeout(fallback);
              completionDelay = setTimeout(() => finish({ success: true, message: `${actionMsg} successful` }), 1500); // Give content script time to inject
            }
          };
          chrome.tabs.onUpdated.addListener(listener);
          const fallback = setTimeout(() => {
            chrome.tabs.onUpdated.removeListener(listener);
            finish({ success: false, code: ErrorCode.TOOL_RESULT_UNVERIFIED, error: `${actionMsg} could not be verified before timeout.` });
          }, 10000);
          cleanupPendingAction = () => {
            chrome.tabs.onUpdated.removeListener(listener);
            clearTimeout(fallback);
            if (completionDelay) clearTimeout(completionDelay);
          };
        });
      }

      if (name === "navigate") {
        updateTabAndWait(activeTab.id, { url: args.url }, `Navigated to ${args.url}`);
      } else if (name === "google_search") {
        const url = `https://www.google.com/search?q=${encodeURIComponent(args.query)}`;
        updateTabAndWait(activeTab.id, { url }, `Searched Google for ${args.query}`);
      } else {
        // Send to content script for DOM manipulation (read, click, type)
        chrome.tabs.sendMessage(activeTab.id, { action: name, args }, (response) => {
          if (signal?.aborted) {
            finish({ error: 'Action cancelled.' });
            return;
          }
          if (chrome.runtime.lastError) {
             finish({ error: "Cannot communicate with page. It might be a protected page or refreshing." });
          } else if (response?.error && /element not found/i.test(response.error) && name !== 'read_page' && options.refreshStale !== false) {
            chrome.tabs.sendMessage(activeTab.id, { action: 'get_page_context' }, (contextResponse) => {
              finish({
                success: false,
                code: 'DOM_TARGET_STALE',
                error: 'The page target is stale. Page context was refreshed once.',
                refreshedContext: contextResponse?.text || ''
              });
            });
          } else {
             finish(response || { success: false, code: ErrorCode.TOOL_RESULT_UNVERIFIED, error: "No response from page" });
          }
        });
      }
    });
  });
}

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'chat_stream') {
    let activeRequest = null;
    port.onMessage.addListener(async (message) => {
      if (message.type === CHAT_REQUEST) {
        activeRequest?.abort();
        const lifecycle = createRequestLifecycle(port, message.requestId || null);
        activeRequest = lifecycle;
        try {
          const request = validateChatRequest(message);
          await handleAIRequestStream(request, lifecycle);
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

async function handleAIRequestStream(request, lifecycle) {
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
      const result = await executeTool(name, args, toolSignal, { refreshStale: !staleRefreshUsed });
      if (result?.code === 'DOM_TARGET_STALE') staleRefreshUsed = true;
      return result;
    },
    onChunk: (chunk) => lifecycle.post({ chunk }),
    onStatus: (status) => lifecycle.post({ status })
  });
}
