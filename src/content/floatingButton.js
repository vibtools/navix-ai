// Floating AI Copilot launcher button

export function createFloatingButton() {
  if (document.getElementById('ai-copilot-launcher')) return;

  const button = document.createElement('button');
  button.id = 'ai-copilot-launcher';
  button.innerText = 'AI';
  button.title = 'Open AI Browser Copilot';

  button.onclick = () => {
    window.postMessage({ type: 'AI_COPILOT_OPEN_SIDEBAR' }, '*');
  };

  document.body.appendChild(button);
}
