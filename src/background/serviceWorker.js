// AI Browser Copilot Background Service Worker

import { routeAIRequest } from '../ai/requestRouter.js';

chrome.runtime.onInstalled.addListener(() => {
  console.log('AI Browser Copilot installed');
});

async function getCurrentPageContext(tabId) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(
      tabId,
      { type: 'GET_PAGE_CONTEXT' },
      (response) => {
        resolve(response || { error: 'No page response' });
      }
    );
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PING') {
    sendResponse({ status: 'ready' });
    return true;
  }

  if (message.type === 'GET_CURRENT_PAGE_CONTEXT') {
    if (!sender.tab?.id) {
      sendResponse({ error: 'No active tab found' });
      return true;
    }

    getCurrentPageContext(sender.tab.id).then(sendResponse);
    return true;
  }

  if (message.type === 'AI_CHAT_REQUEST') {
    handleAIRequest(message, sender)
      .then(sendResponse)
      .catch((error) => {
        sendResponse({
          error: error.message || 'AI request failed'
        });
      });

    return true;
  }

  return true;
});

async function handleAIRequest(message, sender) {
  const tabId = sender.tab?.id;

  let pageContext = null;

  if (tabId) {
    pageContext = await getCurrentPageContext(tabId);
  }

  return routeAIRequest({
    userMessage: message.payload,
    pageContext
  });
}
