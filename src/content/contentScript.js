// AI Browser Copilot Content Script

console.log('AI Browser Copilot content script loaded');

function getPageContext() {
  return {
    title: document.title,
    url: window.location.href,
    text: document.body.innerText.slice(0, 5000)
  };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_PAGE_CONTEXT') {
    sendResponse(getPageContext());
  }
  return true;
});
