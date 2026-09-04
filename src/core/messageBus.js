export function sendMessage(type, payload) {
  chrome.runtime.sendMessage({
    type,
    payload
  });
}

export function listenMessage(handler) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    handler(message, sender, sendResponse);
    return true;
  });
}
