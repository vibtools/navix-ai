import React, { useState } from 'react';

export default function Sidebar() {
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);

  function sendMessage() {
    if (!message.trim() || loading) return;

    const userMessage = message.trim();

    setChat((items) => [
      ...items,
      { role: 'user', text: userMessage }
    ]);

    setMessage('');
    setLoading(true);

    chrome.runtime.sendMessage(
      {
        type: 'AI_CHAT_REQUEST',
        message: userMessage
      },
      (response) => {
        setChat((items) => [
          ...items,
          {
            role: 'assistant',
            text: response?.message || 'No response received.'
          }
        ]);
        setLoading(false);
      }
    );
  }

  return (
    <aside className="ai-sidebar">
      <h2>AI Browser Copilot</h2>

      <div className="chat-area">
        {chat.map((item, index) => (
          <div key={index}>
            <strong>{item.role}:</strong> {item.text}
          </div>
        ))}
        {loading && <div>AI is processing...</div>}
      </div>

      <input
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder="Ask AI..."
      />

      <button onClick={sendMessage}>Send</button>
    </aside>
  );
}
