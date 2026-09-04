export default function ChatPanel() {
  return (
    <div className="ai-chat-panel">
      <div className="ai-header">
        <h3>Navix AI</h3>
        <button id="close-ai-sidebar">×</button>
      </div>
      <div id="ai-messages"></div>
      <div className="ai-input-area">
        <input id="ai-input" placeholder="Ask AI about this page..." />
        <button id="ai-send">Send</button>
      </div>
    </div>
  );
}
