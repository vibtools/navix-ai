import React, { useState } from 'react';

export default function Sidebar() {
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState([]);

  function sendMessage() {
    if (!message.trim()) return;

    setChat((items) => [
      ...items,
      { role: 'user', text: message }
    ]);

    setMessage('');
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
