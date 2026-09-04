// Phase-2 sidebar injection foundation

export function injectSidebar() {
  if (document.getElementById('ai-browser-copilot-sidebar')) return;

  const sidebar = document.createElement('div');
  sidebar.id = 'ai-browser-copilot-sidebar';
  sidebar.innerHTML = `
    <div style="position:fixed;right:0;top:0;width:360px;height:100vh;background:#111;color:white;z-index:999999;padding:20px;font-family:sans-serif;">
      <h3>AI Browser Copilot</h3>
      <p>Sidebar initialized.</p>
    </div>`;

  document.body.appendChild(sidebar);
}
