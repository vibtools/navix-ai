// AI Browser Copilot Background Service Worker

chrome.runtime.onInstalled.addListener(() => {
  console.log('AI Browser Copilot installed');
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PING') {
    sendResponse({ status: 'ready' });
  }
  return true;
});
