const SIDEBAR_ID = 'ai-browser-copilot-sidebar';

export function createSidebar() {
  if (document.getElementById(SIDEBAR_ID)) return;

  const container = document.createElement('div');
  container.id = SIDEBAR_ID;
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.right = '0';
  container.style.width = '380px';
  container.style.height = '100vh';
  container.style.zIndex = '999999';
  container.style.background = '#ffffff';

  document.body.appendChild(container);
}

export function removeSidebar() {
  document.getElementById(SIDEBAR_ID)?.remove();
}
