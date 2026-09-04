// AI Browser Copilot Background Service Worker

chrome.runtime.onInstalled.addListener(() => {
  console.log('AI Browser Copilot installed');
});

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

    chrome.tabs.sendMessage(
      sender.tab.id,
      { type: 'GET_PAGE_CONTEXT' },
      (response) => {
        sendResponse(response || { error: 'No page response' });
      }
    );

    return true;
  }

  if (message.type === 'AI_CHAT_REQUEST') {
    sendResponse({
      status: 'received',
      message: message.payload || null
    });
    return true;
  }

  return true;
});
