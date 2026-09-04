export function connectSidebarEvents() {
  const sendButton = document.getElementById('ai-send-btn');
  const input = document.getElementById('ai-user-input');

  if (!sendButton || !input) return;

  sendButton.addEventListener('click', () => {
    chrome.runtime.sendMessage({
      type: 'AI_USER_MESSAGE',
      payload: input.value
    });
  });
}
