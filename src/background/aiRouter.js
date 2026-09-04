chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'AI_USER_MESSAGE') {
    handleAIRequest(message.payload).then(sendResponse);
    return true;
  }
});

async function handleAIRequest(prompt) {
  return {
    success: true,
    message: `AI request received: ${prompt}`
  };
}
