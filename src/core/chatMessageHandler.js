// Handles sidebar/content/background message flow

export function createMessage(type, payload = {}) {
  return {
    type,
    payload,
    timestamp: Date.now()
  };
}

export function sendChatMessage(message) {
  return createMessage('AI_CHAT_MESSAGE', { message });
}
