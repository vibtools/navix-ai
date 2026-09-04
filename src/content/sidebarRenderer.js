export function renderSidebar() {
  if (document.getElementById('ai-browser-copilot-sidebar')) return;

  const sidebar = document.createElement('div');
  sidebar.id = 'ai-browser-copilot-sidebar';
  sidebar.innerHTML = `
    <div class="ai-sidebar-header">
      <span>AI Browser Copilot</span>
      <button id="ai-sidebar-close">×</button>
    </div>
    <div id="ai-chat-messages"></div>
    <div class="ai-chat-input">
      <input id="ai-user-input" placeholder="Ask AI..." />
      <button id="ai-send-btn">Send</button>
    </div>
  `;

  document.body.appendChild(sidebar);
}
